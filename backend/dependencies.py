from fastapi import HTTPException, Request
from jose import JWTError
from sqlalchemy.orm import Session

from modules.users.auth import decode_access_token
from modules.users.models import User


def get_current_user(request: Request, db: Session) -> User:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        payload = decode_access_token(auth[7:])
        user = db.query(User).filter(
            User.id == int(payload["sub"]),
            User.is_active.is_(True),
        ).first()
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur introuvable")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide")


def require_admin(request: Request, db: Session) -> User:
    user = get_current_user(request, db)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return user
