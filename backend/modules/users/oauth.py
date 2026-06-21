import os
import secrets
import time

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db

from .auth import (
    ALGORITHM,
    REFRESH_TOKEN_EXPIRE_DAYS,
    REFRESH_SECRET_KEY,
    SECRET_KEY,
    create_refresh_token,
)
from .models import User

router = APIRouter(prefix="/auth", tags=["oauth"])

FRONTEND_URL        = os.getenv("FRONTEND_URL", "http://localhost:3000")
GOOGLE_CLIENT_ID    = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET= os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "")
FB_CLIENT_ID        = os.getenv("FACEBOOK_CLIENT_ID", "")
FB_CLIENT_SECRET    = os.getenv("FACEBOOK_CLIENT_SECRET", "")
FB_REDIRECT_URI     = os.getenv("FACEBOOK_REDIRECT_URI", "")

REFRESH_MAX_AGE = REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600


def _make_state() -> str:
    payload = {"nonce": secrets.token_hex(16), "exp": int(time.time()) + 600}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _verify_state(state: str) -> None:
    try:
        jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(400, "État OAuth invalide ou expiré")


def _set_cookie(response: RedirectResponse, token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=REFRESH_MAX_AGE,
        path="/api/auth",
    )


def _find_or_create(
    db: Session,
    *,
    provider: str,
    provider_id: str,
    email: str,
    first_name: str,
    last_name: str,
) -> User:
    # 1. Compte déjà lié à ce provider
    filter_col = User.google_id if provider == "google" else User.facebook_id
    user = db.query(User).filter(filter_col == provider_id).first()
    if user:
        return user

    # 2. Email déjà en base → on lie le provider
    user = db.query(User).filter(User.email == email, User.is_active.is_(True)).first()
    if user:
        if provider == "google":
            user.google_id = provider_id
        else:
            user.facebook_id = provider_id
        db.commit()
        return user

    # 3. Nouveau compte
    user = User(
        email=email,
        hashed_password=None,
        first_name=first_name,
        last_name=last_name,
        role="client",
        google_id=provider_id if provider == "google" else None,
        facebook_id=provider_id if provider == "facebook" else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _login_redirect(user: User) -> RedirectResponse:
    refresh_token, _, _ = create_refresh_token(user.id)
    redirect = RedirectResponse(f"{FRONTEND_URL}/connexion?oauth=1", status_code=302)
    _set_cookie(redirect, refresh_token)
    return redirect


def _error_redirect() -> RedirectResponse:
    return RedirectResponse(f"{FRONTEND_URL}/connexion?oauth_error=1", status_code=302)


# ── Google ────────────────────────────────────────────────────────────────────

@router.get("/google")
def google_login():
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(503, "Connexion Google non configurée")
    import urllib.parse
    params = urllib.parse.urlencode({
        "client_id":     GOOGLE_CLIENT_ID,
        "redirect_uri":  GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope":         "openid email profile",
        "state":         _make_state(),
        "access_type":   "offline",
        "prompt":        "select_account",
    })
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@router.get("/google/callback")
async def google_callback(
    code: str = "",
    state: str = "",
    error: str = "",
    db: Session = Depends(get_db),
):
    if error or not code:
        return _error_redirect()
    _verify_state(state)

    async with httpx.AsyncClient(timeout=10) as client:
        token_res = await client.post("https://oauth2.googleapis.com/token", data={
            "code":          code,
            "client_id":     GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri":  GOOGLE_REDIRECT_URI,
            "grant_type":    "authorization_code",
        })
        if token_res.status_code != 200:
            return _error_redirect()

        info_res = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token_res.json()['access_token']}"},
        )
        if info_res.status_code != 200:
            return _error_redirect()
        info = info_res.json()

    if not info.get("email"):
        return _error_redirect()

    user = _find_or_create(
        db,
        provider="google",
        provider_id=info["sub"],
        email=info["email"],
        first_name=info.get("given_name", ""),
        last_name=info.get("family_name", ""),
    )
    return _login_redirect(user)


# ── Facebook ──────────────────────────────────────────────────────────────────

@router.get("/facebook")
def facebook_login():
    if not FB_CLIENT_ID:
        raise HTTPException(503, "Connexion Facebook non configurée")
    import urllib.parse
    params = urllib.parse.urlencode({
        "client_id":    FB_CLIENT_ID,
        "redirect_uri": FB_REDIRECT_URI,
        "response_type":"code",
        "scope":        "email,public_profile",
        "state":        _make_state(),
    })
    return RedirectResponse(f"https://www.facebook.com/v19.0/dialog/oauth?{params}")


@router.get("/facebook/callback")
async def facebook_callback(
    code: str = "",
    state: str = "",
    error: str = "",
    db: Session = Depends(get_db),
):
    if error or not code:
        return _error_redirect()
    _verify_state(state)

    async with httpx.AsyncClient(timeout=10) as client:
        token_res = await client.get(
            "https://graph.facebook.com/v19.0/oauth/access_token",
            params={
                "client_id":     FB_CLIENT_ID,
                "client_secret": FB_CLIENT_SECRET,
                "redirect_uri":  FB_REDIRECT_URI,
                "code":          code,
            },
        )
        if token_res.status_code != 200:
            return _error_redirect()

        info_res = await client.get(
            "https://graph.facebook.com/me",
            params={
                "fields":       "id,first_name,last_name,email",
                "access_token": token_res.json()["access_token"],
            },
        )
        if info_res.status_code != 200:
            return _error_redirect()
        info = info_res.json()

    if not info.get("email"):
        return _error_redirect()

    user = _find_or_create(
        db,
        provider="facebook",
        provider_id=info["id"],
        email=info["email"],
        first_name=info.get("first_name", ""),
        last_name=info.get("last_name", ""),
    )
    return _login_redirect(user)
