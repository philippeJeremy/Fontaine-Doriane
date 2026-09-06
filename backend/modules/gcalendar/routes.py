import os
import urllib.parse

import httpx
from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_admin
from modules.settings.models import AppSettings

from .service import _get, _set

router = APIRouter(prefix="/gcalendar", tags=["gcalendar"])

SCOPE        = "https://www.googleapis.com/auth/calendar.events"
AUTH_URI     = "https://accounts.google.com/o/oauth2/auth"
TOKEN_URI    = "https://oauth2.googleapis.com/token"


def _redirect_uri() -> str:
    return os.getenv("GOOGLE_CALENDAR_REDIRECT_URI", "")


@router.get("/auth-url")
def get_auth_url(request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    params = {
        "client_id":     os.getenv("GOOGLE_CLIENT_ID", ""),
        "redirect_uri":  _redirect_uri(),
        "response_type": "code",
        "scope":         SCOPE,
        "access_type":   "offline",
        "prompt":        "consent",
    }
    url = AUTH_URI + "?" + urllib.parse.urlencode(params)
    return {"url": url}


@router.get("/callback")
def gcal_callback(code: str, db: Session = Depends(get_db)):
    resp = httpx.post(TOKEN_URI, data={
        "code":          code,
        "client_id":     os.getenv("GOOGLE_CLIENT_ID", ""),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
        "redirect_uri":  _redirect_uri(),
        "grant_type":    "authorization_code",
    })
    data = resp.json()
    refresh_token = data.get("refresh_token")
    access_token  = data.get("access_token")
    if not refresh_token:
        return RedirectResponse("/admin/parametres?gcal=error")
    _set(db, "gcal_refresh_token", refresh_token)
    _set(db, "gcal_access_token",  access_token or "")
    db.commit()
    return RedirectResponse("/admin/parametres?gcal=ok")


@router.get("/status")
def gcal_status(request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    return {"connected": bool(_get(db, "gcal_refresh_token"))}


@router.delete("/disconnect")
def gcal_disconnect(request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    for key in ("gcal_refresh_token", "gcal_access_token"):
        row = db.query(AppSettings).filter(AppSettings.key == key).first()
        if row:
            db.delete(row)
    db.commit()
    return {"connected": False}
