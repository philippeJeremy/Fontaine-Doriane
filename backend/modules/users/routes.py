import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from jose import JWTError
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from database import get_db
from limiter import limiter

from modules.appointments.models import Appointment

from .auth import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from .models import User

router = APIRouter(prefix="/auth", tags=["auth"])

audit = logging.getLogger("audit")

REFRESH_MAX_AGE = 7 * 24 * 3600


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class RegisterInput(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: str | None = None


class ChangePasswordInput(BaseModel):
    current_password: str
    new_password: str


def _current_user(request: Request, db: Session = Depends(get_db)) -> User:
    refresh = request.cookies.get("refresh_token")
    if not refresh:
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        payload = decode_refresh_token(refresh)
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide")
    user = db.query(User).filter(User.id == int(payload["sub"]), User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    return user


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=REFRESH_MAX_AGE,
        path="/auth",
    )


@router.post("/register", status_code=201)
@limiter.limit("5/minute")
def register(request: Request, payload: RegisterInput, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Un compte existe déjà avec cet email")
    if len(payload.password) < 8:
        raise HTTPException(status_code=422, detail="Le mot de passe doit faire au moins 8 caractères")
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
        role="client",
    )
    db.add(user)
    db.commit()
    audit.info("REGISTER user_id=%s ip=%s", user.id, request.client.host if request.client else "?")
    return {"detail": "Compte créé avec succès"}


@router.post("/login")
@limiter.limit("10/minute")
def login(request: Request, payload: LoginInput, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email, User.is_active.is_(True)).first()
    if not user or not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        audit.warning("LOGIN_FAILED email=%s ip=%s", payload.email, request.client.host if request.client else "?")
        raise HTTPException(status_code=401, detail="Identifiants invalides")

    access_token, exp = create_access_token(user.id, user.role)
    refresh_token, _jti, _refresh_exp = create_refresh_token(user.id)
    _set_refresh_cookie(response, refresh_token)
    audit.info("LOGIN_OK user_id=%s ip=%s", user.id, request.client.host if request.client else "?")

    return {
        "access_token": access_token,
        "expires_at": exp,
        "user": {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "must_change_password": user.must_change_password,
        },
    }


@router.get("/me")
def me(response: Response, user: User = Depends(_current_user)):
    access_token, exp = create_access_token(user.id, user.role)
    return {
        "access_token": access_token,
        "expires_at": exp,
        "user": {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "must_change_password": user.must_change_password,
        },
    }


@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        payload = decode_refresh_token(token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide")

    user = db.query(User).filter(User.id == int(payload["sub"]), User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")

    access_token, exp = create_access_token(user.id, user.role)
    new_refresh, _jti, _exp = create_refresh_token(user.id)
    _set_refresh_cookie(response, new_refresh)
    return {"access_token": access_token, "expires_at": exp}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("refresh_token", path="/auth")
    return {"detail": "Déconnecté"}


@router.get("/users/search")
def search_users(
    q: str = Query(..., min_length=2),
    request: Request = None,
    db: Session = Depends(get_db),
):
    """Recherche de client par email (admin). Retourne le premier résultat exact ou partiel."""
    from dependencies import require_admin
    require_admin(request, db)
    user = (
        db.query(User)
        .filter(User.is_active.is_(True), User.email.ilike(f"%{q}%"))
        .first()
    )
    if not user:
        return None
    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone": user.phone,
    }


@router.get("/me/export")
def export_my_data(user: User = Depends(_current_user), db: Session = Depends(get_db)):
    """Droit à la portabilité — RGPD Art. 20."""
    appts = db.query(Appointment).filter(Appointment.client_id == user.id).all()
    return {
        "profil": {
            "email": user.email,
            "prenom": user.first_name,
            "nom": user.last_name,
            "telephone": user.phone,
            "role": user.role,
            "cree_le": user.created_at.isoformat(),
        },
        "rendez_vous": [
            {
                "date": a.date.isoformat(),
                "heure_debut": a.start_time.strftime("%H:%M"),
                "heure_fin": a.end_time.strftime("%H:%M"),
                "statut": a.status,
                "total_eur": float(a.total_price),
                "prestations": [
                    {"nom": it.service.name, "quantite": it.quantity}
                    for it in a.items
                ],
            }
            for a in appts
        ],
    }


@router.delete("/me", status_code=204)
def delete_my_account(
    response: Response,
    user: User = Depends(_current_user),
    db: Session = Depends(get_db),
):
    """Droit à l'effacement — RGPD Art. 17."""
    for appt in db.query(Appointment).filter(Appointment.client_id == user.id).all():
        db.delete(appt)  # cascade supprime les AppointmentService liés
    db.delete(user)
    db.commit()
    response.delete_cookie("refresh_token", path="/auth")
    audit.info("ACCOUNT_DELETED user_id=%s", user.id)


@router.patch("/change-password")
@limiter.limit("5/minute")
def change_password(
    request: Request,
    payload: ChangePasswordInput,
    db: Session = Depends(get_db),
    user: User = Depends(_current_user),
):
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=422, detail="Le nouveau mot de passe doit faire au moins 8 caractères")
    user.hashed_password = hash_password(payload.new_password)
    user.must_change_password = False
    db.commit()
    audit.info("PASSWORD_CHANGED user_id=%s", user.id)
    return {"detail": "Mot de passe mis à jour"}
