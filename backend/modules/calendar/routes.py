from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_admin
from modules.appointments.models import ClosedDay, WorkingHours

router = APIRouter(tags=["calendar"])


# ── Schémas ──────────────────────────────────────────────────────────────────

class WorkingHoursUpdate(BaseModel):
    is_open: bool
    open_time: Optional[str] = None   # "HH:MM"
    close_time: Optional[str] = None  # "HH:MM"
    address: Optional[str] = None


class ClosedDayCreate(BaseModel):
    date: str          # "YYYY-MM-DD"
    reason: Optional[str] = None


def _wh_to_dict(wh: WorkingHours) -> dict:
    return {
        "id": wh.id,
        "day_of_week": wh.day_of_week,
        "is_open": wh.is_open,
        "open_time": wh.open_time.strftime("%H:%M") if wh.open_time else None,
        "close_time": wh.close_time.strftime("%H:%M") if wh.close_time else None,
        "address": wh.address,
    }


def _cd_to_dict(cd: ClosedDay) -> dict:
    return {"id": cd.id, "date": cd.date.isoformat(), "reason": cd.reason}


# ── Horaires hebdomadaires ────────────────────────────────────────────────────

@router.get("/calendar/working-hours")
def get_working_hours(db: Session = Depends(get_db)):
    rows = db.query(WorkingHours).order_by(WorkingHours.day_of_week).all()
    return [_wh_to_dict(r) for r in rows]


@router.put("/calendar/working-hours/{day_of_week}")
def update_working_hours(
    day_of_week: int,
    payload: WorkingHoursUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    require_admin(request, db)
    if day_of_week not in range(7):
        raise HTTPException(status_code=422, detail="Jour invalide (0=Lun … 6=Dim)")

    wh = db.query(WorkingHours).filter(WorkingHours.day_of_week == day_of_week).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Horaire introuvable")

    wh.is_open = payload.is_open
    if payload.is_open:
        if not payload.open_time or not payload.close_time:
            raise HTTPException(status_code=422, detail="open_time et close_time requis quand is_open=true")
        from datetime import time as _time
        try:
            h_open, m_open = map(int, payload.open_time.split(":"))
            h_close, m_close = map(int, payload.close_time.split(":"))
            wh.open_time = _time(h_open, m_open)
            wh.close_time = _time(h_close, m_close)
        except (ValueError, AttributeError):
            raise HTTPException(status_code=422, detail="Format HH:MM requis")
    wh.address = payload.address or None

    db.commit()
    db.refresh(wh)
    return _wh_to_dict(wh)


# ── Jours exceptionnellement fermés ──────────────────────────────────────────

@router.get("/calendar/closed-days")
def get_closed_days(db: Session = Depends(get_db)):
    rows = db.query(ClosedDay).order_by(ClosedDay.date).all()
    return [_cd_to_dict(r) for r in rows]


@router.post("/calendar/closed-days", status_code=201)
def add_closed_day(
    payload: ClosedDayCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    require_admin(request, db)
    try:
        d = date.fromisoformat(payload.date)
    except ValueError:
        raise HTTPException(status_code=422, detail="Format de date invalide (YYYY-MM-DD)")

    if db.query(ClosedDay).filter(ClosedDay.date == d).first():
        raise HTTPException(status_code=409, detail="Ce jour est déjà fermé")

    cd = ClosedDay(date=d, reason=payload.reason or None)
    db.add(cd)
    db.commit()
    db.refresh(cd)
    return _cd_to_dict(cd)


@router.delete("/calendar/closed-days/{closed_day_id}", status_code=204)
def delete_closed_day(
    closed_day_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    require_admin(request, db)
    cd = db.query(ClosedDay).filter(ClosedDay.id == closed_day_id).first()
    if not cd:
        raise HTTPException(status_code=404, detail="Jour fermé introuvable")
    db.delete(cd)
    db.commit()
