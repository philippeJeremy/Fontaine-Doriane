import json

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_admin

from .models import AppSettings

router = APIRouter(prefix="/settings", tags=["settings"])

KEY_ENABLED    = "home_service_enabled"
KEY_SURCHARGE  = "home_service_surcharge"
KEY_VAT_EXEMPT = "vat_exempt"
KEY_ADDRESS    = "business_address"
KEY_PHONE      = "business_phone"
KEY_HOURS      = "opening_hours"

_DEFAULT_HOURS = {
    "lundi":    "9h – 19h",
    "mardi":    "9h – 19h",
    "mercredi": "9h – 19h",
    "jeudi":    "9h – 19h",
    "vendredi": "9h – 19h",
    "samedi":   "9h – 18h",
    "dimanche": "Fermé",
}


def _get(db: Session, key: str, default: str = "") -> str:
    row = db.query(AppSettings).filter(AppSettings.key == key).first()
    return row.value if row else default


def _set(db: Session, key: str, value: str) -> None:
    row = db.query(AppSettings).filter(AppSettings.key == key).first()
    if row:
        row.value = value
    else:
        db.add(AppSettings(key=key, value=value))


@router.get("/home-service")
def get_home_service(db: Session = Depends(get_db)):
    return {
        "enabled":   _get(db, KEY_ENABLED,   "false") == "true",
        "surcharge": float(_get(db, KEY_SURCHARGE, "0")),
    }


class HomeServiceUpdate(BaseModel):
    enabled:   bool
    surcharge: float


@router.put("/home-service")
def update_home_service(
    payload: HomeServiceUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    require_admin(request, db)
    if payload.surcharge < 0:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="Le supplément ne peut pas être négatif")
    _set(db, KEY_ENABLED,   "true" if payload.enabled else "false")
    _set(db, KEY_SURCHARGE, str(round(payload.surcharge, 2)))
    db.commit()
    return {"enabled": payload.enabled, "surcharge": payload.surcharge}


@router.get("/vat")
def get_vat_settings(db: Session = Depends(get_db)):
    return {"vat_exempt": _get(db, KEY_VAT_EXEMPT, "true") == "true"}


class VatUpdate(BaseModel):
    vat_exempt: bool


@router.put("/vat")
def update_vat_settings(
    payload: VatUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    require_admin(request, db)
    _set(db, KEY_VAT_EXEMPT, "true" if payload.vat_exempt else "false")
    db.commit()
    return {"vat_exempt": payload.vat_exempt}


# ── Informations salon (public) ────────────────────────────────────────────────

@router.get("/business")
def get_business(db: Session = Depends(get_db)):
    hours_raw = _get(db, KEY_HOURS, "")
    try:
        hours = json.loads(hours_raw) if hours_raw else _DEFAULT_HOURS
    except Exception:
        hours = _DEFAULT_HOURS
    return {
        "address":       _get(db, KEY_ADDRESS, "Guidel, 56520"),
        "phone":         _get(db, KEY_PHONE, ""),
        "opening_hours": hours,
    }


class BusinessUpdate(BaseModel):
    address:       str
    phone:         str
    opening_hours: dict


@router.put("/business")
def update_business(
    payload: BusinessUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    require_admin(request, db)
    _set(db, KEY_ADDRESS, payload.address.strip())
    _set(db, KEY_PHONE,   payload.phone.strip())
    _set(db, KEY_HOURS,   json.dumps(payload.opening_hours, ensure_ascii=False))
    db.commit()
    return {
        "address":       payload.address,
        "phone":         payload.phone,
        "opening_hours": payload.opening_hours,
    }
