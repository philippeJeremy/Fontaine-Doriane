from datetime import date, datetime, time, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user, require_admin
from email_service import send_appointment_confirmation, send_appointment_notification
from modules.gcalendar import service as gcal
from modules.services.models import Service
from modules.users.models import User

from modules.settings.models import AppSettings
from .models import Appointment, AppointmentService, ClosedDay, WorkingHours

router = APIRouter(prefix="/appointments", tags=["appointments"])

SLOT_INTERVAL = 15  # minutes


class ServiceItem(BaseModel):
    id: int
    quantity: int = 1


class AppointmentCreate(BaseModel):
    date: str          # YYYY-MM-DD
    start_time: str    # HH:MM
    services: List[ServiceItem]
    notes: Optional[str] = None
    is_home_service: bool = False
    client_address: Optional[str] = None


def _appt_to_dict(a: Appointment, include_client: bool = False) -> dict:
    d = {
        "id": a.id,
        "date": a.date.isoformat(),
        "start_time": a.start_time.strftime("%H:%M"),
        "end_time": a.end_time.strftime("%H:%M"),
        "total_price": float(a.total_price),
        "status": a.status,
        "notes": a.notes,
        "is_home_service": a.is_home_service,
        "client_address": a.client_address,
        "home_service_surcharge": float(a.home_service_surcharge),
        "created_at": a.created_at.isoformat(),
        "services": [
            {
                "id": item.service.id,
                "name": item.service.name,
                "price": float(item.service.price),
                "duration_minutes": item.service.duration_minutes,
                "quantity": item.quantity,
            }
            for item in a.items
        ],
    }
    if include_client:
        if a.client:
            d["client"] = {
                "id": a.client.id,
                "email": a.client.email,
                "first_name": a.client.first_name,
                "last_name": a.client.last_name,
                "phone": a.client.phone,
            }
        elif a.manual_client_name:
            d["client"] = {
                "id": None,
                "email": None,
                "first_name": a.manual_client_name,
                "last_name": "",
                "phone": a.manual_client_phone,
            }
        else:
            d["client"] = None
    d["manual_client_name"]  = a.manual_client_name
    d["manual_client_phone"] = a.manual_client_phone
    return d


@router.get("/available-slots")
def available_slots(
    appt_date: str = Query(alias="date"),
    duration: int = Query(ge=1),
    db: Session = Depends(get_db),
):
    try:
        target_date = date.fromisoformat(appt_date)
    except ValueError:
        raise HTTPException(status_code=422, detail="Format de date invalide (YYYY-MM-DD)")

    if target_date < date.today():
        return []

    closed = db.query(ClosedDay).filter(ClosedDay.date == target_date).first()
    if closed:
        return []

    day_of_week = target_date.weekday()
    hours = db.query(WorkingHours).filter(WorkingHours.day_of_week == day_of_week).first()
    if not hours or not hours.is_open:
        return []

    existing = (
        db.query(Appointment)
        .filter(
            Appointment.date == target_date,
            Appointment.status.in_(["pending", "confirmed"]),
        )
        .all()
    )

    open_dt = datetime.combine(target_date, hours.open_time)
    close_dt = datetime.combine(target_date, hours.close_time)

    slots = []
    current = open_dt
    while current < close_dt:
        slot_end = current + timedelta(minutes=duration)
        if slot_end > close_dt:
            status = "no_fit"
        else:
            conflict = any(
                current < datetime.combine(target_date, a.end_time)
                and slot_end > datetime.combine(target_date, a.start_time)
                for a in existing
            )
            status = "unavailable" if conflict else "available"
        slots.append({"time": current.strftime("%H:%M"), "status": status})
        current += timedelta(minutes=SLOT_INTERVAL)

    return slots


@router.post("", status_code=201)
def create_appointment(
    request: Request,
    payload: AppointmentCreate,
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)

    try:
        appt_date = date.fromisoformat(payload.date)
        start = time.fromisoformat(payload.start_time)
    except ValueError:
        raise HTTPException(status_code=422, detail="Format de date ou heure invalide")

    if appt_date < date.today():
        raise HTTPException(status_code=400, detail="Impossible de réserver dans le passé")

    if db.query(ClosedDay).filter(ClosedDay.date == appt_date).first():
        raise HTTPException(status_code=400, detail="Ce jour est fermé exceptionnellement")

    if not payload.services:
        raise HTTPException(status_code=400, detail="Aucune prestation sélectionnée")

    qty_map = {item.id: max(1, item.quantity) for item in payload.services}
    service_ids = list(qty_map.keys())

    services = (
        db.query(Service)
        .filter(Service.id.in_(service_ids), Service.is_active.is_(True))
        .all()
    )
    if len(services) != len(service_ids):
        raise HTTPException(status_code=400, detail="Prestation(s) introuvable(s)")

    total_duration = sum(s.duration_minutes * qty_map[s.id] for s in services)
    total_price = sum(float(s.price) * qty_map[s.id] for s in services)

    # Supplément à domicile
    surcharge = 0.0
    if payload.is_home_service:
        if not payload.client_address or not payload.client_address.strip():
            raise HTTPException(status_code=422, detail="Adresse requise pour une prestation à domicile")
        enabled_row = db.query(AppSettings).filter(AppSettings.key == "home_service_enabled").first()
        if not enabled_row or enabled_row.value != "true":
            raise HTTPException(status_code=400, detail="Les prestations à domicile ne sont pas disponibles")
        surcharge_row = db.query(AppSettings).filter(AppSettings.key == "home_service_surcharge").first()
        surcharge = float(surcharge_row.value) if surcharge_row else 0.0
        total_price += surcharge

    start_dt = datetime.combine(appt_date, start)
    end_dt = start_dt + timedelta(minutes=total_duration)

    # Vérification des conflits (anti-race condition)
    conflict = (
        db.query(Appointment)
        .filter(
            Appointment.date == appt_date,
            Appointment.status.in_(["pending", "confirmed"]),
            Appointment.start_time < end_dt.time(),
            Appointment.end_time > start,
        )
        .first()
    )
    if conflict:
        raise HTTPException(status_code=409, detail="Ce créneau n'est plus disponible")

    appt = Appointment(
        client_id=user.id,
        date=appt_date,
        start_time=start,
        end_time=end_dt.time(),
        total_price=total_price,
        notes=payload.notes,
        is_home_service=payload.is_home_service,
        client_address=payload.client_address.strip() if payload.is_home_service and payload.client_address else None,
        home_service_surcharge=surcharge,
    )
    db.add(appt)
    db.flush()

    for svc in services:
        db.add(AppointmentService(
            appointment_id=appt.id,
            service_id=svc.id,
            quantity=qty_map[svc.id],
        ))

    db.commit()
    db.refresh(appt)

    # Notifier l'admin par email
    service_labels = [
        f"{s.name} × {qty_map[s.id]}" if qty_map[s.id] > 1 else s.name
        for s in services
    ]
    send_appointment_notification(
        client_name=f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email,
        client_email=user.email,
        date_str=appt_date.strftime("%d/%m/%Y"),
        time_str=start.strftime("%H:%M"),
        services=service_labels,
        total=total_price,
    )

    return {"id": appt.id, "status": appt.status}


@router.get("/me")
def my_appointments(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    appts = (
        db.query(Appointment)
        .filter(Appointment.client_id == user.id)
        .order_by(Appointment.date.desc(), Appointment.start_time.desc())
        .all()
    )
    return [_appt_to_dict(a) for a in appts]


@router.get("")
def list_all_appointments(request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    appts = (
        db.query(Appointment)
        .order_by(Appointment.date.desc(), Appointment.start_time.desc())
        .all()
    )
    return [_appt_to_dict(a, include_client=True) for a in appts]


@router.patch("/{appt_id}/confirm")
def confirm_appointment(appt_id: int, request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable")
    if appt.status != "pending":
        raise HTTPException(status_code=400, detail=f"Statut actuel : {appt.status}")
    appt.status = "confirmed"
    db.commit()
    db.refresh(appt)

    # Sync Google Calendar
    event_id = gcal.create_event(db, appt)
    if event_id:
        appt.gcal_event_id = event_id
        db.commit()

    # Email de confirmation au client
    client = appt.client
    if client:
        send_appointment_confirmation(
            to_email=client.email,
            client_name=f"{client.first_name or ''} {client.last_name or ''}".strip() or client.email,
            date_str=appt.date.strftime("%d/%m/%Y"),
            time_str=appt.start_time.strftime("%H:%M"),
            services=[
                f"{item.service.name} × {item.quantity}" if item.quantity > 1 else item.service.name
                for item in appt.items
            ],
            total=float(appt.total_price),
        )

    return _appt_to_dict(appt, include_client=True)


@router.patch("/{appt_id}/cancel")
def cancel_appointment(appt_id: int, request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable")
    event_id = appt.gcal_event_id
    appt.status = "cancelled"
    appt.gcal_event_id = None
    db.commit()

    # Supprime l'événement Google Calendar
    gcal.delete_event(db, event_id)

    return _appt_to_dict(appt, include_client=True)


@router.delete("/{appt_id}", status_code=204)
def delete_appointment(appt_id: int, request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable")
    if appt.status != "cancelled":
        raise HTTPException(status_code=400, detail="Seuls les rendez-vous annulés peuvent être supprimés")
    db.delete(appt)
    db.commit()
    return Response(status_code=204)


# ── Vue planning (mois entier) ────────────────────────────────────────────────

@router.get("/planning")
def planning(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    request: Request = None,
    db: Session = Depends(get_db),
):
    require_admin(request, db)
    import calendar as _cal
    _, last_day = _cal.monthrange(year, month)
    from datetime import date as _date
    start = _date(year, month, 1)
    end = _date(year, month, last_day)
    appts = (
        db.query(Appointment)
        .filter(
            Appointment.date >= start,
            Appointment.date <= end,
            Appointment.status != "cancelled",
        )
        .order_by(Appointment.date, Appointment.start_time)
        .all()
    )
    return [_appt_to_dict(a, include_client=True) for a in appts]


# ── Création admin (RDV manuel ou pour un client existant) ────────────────────

class AdminAppointmentCreate(BaseModel):
    date: str
    start_time: str
    services: List[ServiceItem]
    client_id: Optional[int] = None
    manual_client_name: Optional[str] = None
    manual_client_phone: Optional[str] = None
    notes: Optional[str] = None


@router.post("/admin", status_code=201)
def admin_create_appointment(
    request: Request,
    payload: AdminAppointmentCreate,
    db: Session = Depends(get_db),
):
    require_admin(request, db)

    if not payload.client_id and not payload.manual_client_name:
        raise HTTPException(status_code=422, detail="client_id ou manual_client_name requis")

    try:
        appt_date = date.fromisoformat(payload.date)
        start = time.fromisoformat(payload.start_time)
    except ValueError:
        raise HTTPException(status_code=422, detail="Format de date ou heure invalide")

    if not payload.services:
        raise HTTPException(status_code=400, detail="Aucune prestation sélectionnée")

    qty_map = {item.id: max(1, item.quantity) for item in payload.services}
    service_ids = list(qty_map.keys())

    services = (
        db.query(Service)
        .filter(Service.id.in_(service_ids), Service.is_active.is_(True))
        .all()
    )
    if len(services) != len(service_ids):
        raise HTTPException(status_code=400, detail="Prestation(s) introuvable(s)")

    total_duration = sum(s.duration_minutes * qty_map[s.id] for s in services)
    total_price = sum(float(s.price) * qty_map[s.id] for s in services)

    start_dt = datetime.combine(appt_date, start)
    end_dt = start_dt + timedelta(minutes=total_duration)

    conflict = (
        db.query(Appointment)
        .filter(
            Appointment.date == appt_date,
            Appointment.status.in_(["pending", "confirmed"]),
            Appointment.start_time < end_dt.time(),
            Appointment.end_time > start,
        )
        .first()
    )
    if conflict:
        raise HTTPException(status_code=409, detail="Conflit : ce créneau est déjà occupé")

    appt = Appointment(
        client_id=payload.client_id or None,
        manual_client_name=payload.manual_client_name or None,
        manual_client_phone=payload.manual_client_phone or None,
        date=appt_date,
        start_time=start,
        end_time=end_dt.time(),
        total_price=total_price,
        status="confirmed",
        notes=payload.notes,
    )
    db.add(appt)
    db.flush()

    for svc in services:
        db.add(AppointmentService(
            appointment_id=appt.id,
            service_id=svc.id,
            quantity=qty_map[svc.id],
        ))

    db.commit()
    db.refresh(appt)

    # Sync Google Calendar (les RDV admin sont directement confirmés)
    event_id = gcal.create_event(db, appt)
    if event_id:
        appt.gcal_event_id = event_id
        db.commit()

    return _appt_to_dict(appt, include_client=True)
