import os
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_admin
from email_service import RESEND_API_KEY, RESEND_FROM
from modules.appointments.models import Appointment
from modules.users.models import User  # noqa – needed for relationship load

from .models import Invoice
from .pdf import generate_invoice_pdf

router = APIRouter(prefix="/invoices", tags=["invoices"])

BUSINESS_NAME = os.getenv("BUSINESS_NAME", "Les Ongles de Doriane")


# ── Schemas ───────────────────────────────────────────────────────────────────

class InvoiceCreate(BaseModel):
    vat_rate: float = 20.0
    notes: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _client_name(appt: Appointment) -> str:
    if appt.client:
        name = f"{appt.client.first_name or ''} {appt.client.last_name or ''}".strip()
        return name or appt.client.email
    if appt.manual_client_name:
        return appt.manual_client_name
    return "Client inconnu"


def _invoice_to_dict(inv: Invoice) -> dict:
    appt = inv.appointment
    return {
        "id": inv.id,
        "invoice_number": inv.invoice_number,
        "invoice_date": inv.invoice_date.isoformat(),
        "appointment_id": inv.appointment_id,
        "appt_date": appt.date.isoformat() if appt else None,
        "appt_start_time": appt.start_time.strftime("%H:%M") if appt else None,
        "client_name": inv.client_name,
        "client_email": inv.client_email,
        "amount_ht": float(inv.amount_ht),
        "vat_rate": float(inv.vat_rate),
        "amount_vat": float(inv.amount_vat),
        "amount_ttc": float(inv.amount_ttc),
        "status": inv.status,
        "notes": inv.notes,
        "created_at": inv.created_at.isoformat(),
        "validated_at": inv.validated_at.isoformat() if inv.validated_at else None,
        "sent_at": inv.sent_at.isoformat() if inv.sent_at else None,
        "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
        "services": [
            {
                "name": item.service.name,
                "quantity": item.quantity,
                "price_ttc": float(item.service.price),
            }
            for item in appt.items
        ] if appt else [],
        "home_service_surcharge": float(appt.home_service_surcharge) if appt else 0,
    }


def _next_invoice_number(db: Session, year: int) -> str:
    prefix = f"FA-{year}-"
    last = (
        db.query(Invoice)
        .filter(Invoice.invoice_number.like(f"{prefix}%"))
        .with_for_update()
        .order_by(Invoice.invoice_number.desc())
        .first()
    )
    seq = 1
    if last:
        try:
            seq = int(last.invoice_number.rsplit("-", 1)[-1]) + 1
        except (ValueError, IndexError):
            pass
    return f"{prefix}{seq:04d}"


def _build_pdf_data(inv: Invoice) -> dict:
    appt = inv.appointment
    return {
        "invoice_number": inv.invoice_number,
        "invoice_date": inv.invoice_date.strftime("%d/%m/%Y"),
        "client_name": inv.client_name,
        "client_email": inv.client_email,
        "appt_date": appt.date.strftime("%d/%m/%Y") if appt else "",
        "appt_time": appt.start_time.strftime("%H:%M") if appt else "",
        "services": [
            {
                "name": item.service.name,
                "quantity": item.quantity,
                "price_ttc": float(item.service.price),
            }
            for item in appt.items
        ] if appt else [],
        "home_service_surcharge": float(appt.home_service_surcharge) if appt else 0,
        "amount_ht": float(inv.amount_ht),
        "vat_rate": float(inv.vat_rate),
        "amount_vat": float(inv.amount_vat),
        "amount_ttc": float(inv.amount_ttc),
        "notes": inv.notes,
    }


def _invoice_email_html(inv: Invoice) -> str:
    return f"""
    <div style="font-family:sans-serif;max-width:560px;margin:auto;color:#1c1917">
      <h2 style="color:#4a552f">{BUSINESS_NAME}</h2>
      <p>Bonjour {inv.client_name},</p>
      <p>Veuillez trouver ci-joint votre facture
         <strong>{inv.invoice_number}</strong>
         d'un montant de <strong>{float(inv.amount_ttc):.2f}&nbsp;€</strong>.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0;background:#f8f8f4">
        <tr><td style="padding:8px 12px;font-weight:600">Facture N°</td>
            <td style="padding:8px 12px">{inv.invoice_number}</td></tr>
        <tr><td style="padding:8px 12px;font-weight:600">Date</td>
            <td style="padding:8px 12px">{inv.invoice_date.strftime('%d/%m/%Y')}</td></tr>
        <tr><td style="padding:8px 12px;font-weight:600">Montant HT</td>
            <td style="padding:8px 12px">{float(inv.amount_ht):.2f}&nbsp;€</td></tr>
        <tr><td style="padding:8px 12px;font-weight:600">TVA ({float(inv.vat_rate):.0f}%)</td>
            <td style="padding:8px 12px">{float(inv.amount_vat):.2f}&nbsp;€</td></tr>
        <tr style="background:#4a552f;color:white">
            <td style="padding:8px 12px;font-weight:700">Total TTC</td>
            <td style="padding:8px 12px;font-weight:700">{float(inv.amount_ttc):.2f}&nbsp;€</td></tr>
      </table>
      <p>La facture PDF est jointe à cet email.</p>
      <hr style="border:none;border-top:1px solid #e7e5e4;margin:24px 0"/>
      <p>Merci pour votre confiance,<br/><strong>{BUSINESS_NAME}</strong></p>
    </div>
    """


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/appointable")
def appointable_appointments(request: Request, db: Session = Depends(get_db)):
    """Rendez-vous confirmés/en attente sans facture associée."""
    require_admin(request, db)
    invoiced_ids = {row.appointment_id for row in db.query(Invoice.appointment_id).all()}
    query = db.query(Appointment).filter(Appointment.status != "cancelled")
    if invoiced_ids:
        query = query.filter(~Appointment.id.in_(invoiced_ids))
    appts = query.order_by(Appointment.date.desc(), Appointment.start_time.desc()).all()

    result = []
    for a in appts:
        name = _client_name(a)
        result.append({
            "id": a.id,
            "date": a.date.isoformat(),
            "start_time": a.start_time.strftime("%H:%M"),
            "client_name": name,
            "client_email": a.client.email if a.client else None,
            "total_price": float(a.total_price),
            "status": a.status,
            "services": [item.service.name for item in a.items],
        })
    return result


@router.get("")
def list_invoices(
    request: Request,
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    db: Session = Depends(get_db),
):
    require_admin(request, db)
    query = db.query(Invoice)
    if year:
        from sqlalchemy import extract
        query = query.filter(extract("year", Invoice.invoice_date) == year)
    if month:
        from sqlalchemy import extract
        query = query.filter(extract("month", Invoice.invoice_date) == month)
    rows = query.order_by(Invoice.invoice_date.desc(), Invoice.invoice_number.desc()).all()
    return [_invoice_to_dict(inv) for inv in rows]


@router.post("/from-appointment/{appt_id}", status_code=201)
def create_from_appointment(
    appt_id: int,
    request: Request,
    payload: InvoiceCreate,
    db: Session = Depends(get_db),
):
    require_admin(request, db)

    appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(404, "Rendez-vous introuvable")
    if appt.status == "cancelled":
        raise HTTPException(400, "Impossible de facturer un rendez-vous annulé")

    existing = db.query(Invoice).filter(Invoice.appointment_id == appt_id).first()
    if existing:
        raise HTTPException(409, "Ce rendez-vous a déjà une facture")

    client_name = _client_name(appt)
    client_email = appt.client.email if appt.client else None

    amount_ttc = float(appt.total_price)
    vat_rate = float(payload.vat_rate)
    if vat_rate > 0:
        amount_ht = round(amount_ttc / (1 + vat_rate / 100), 2)
    else:
        amount_ht = amount_ttc
    amount_vat = round(amount_ttc - amount_ht, 2)

    today = date.today()
    invoice_number = _next_invoice_number(db, today.year)

    inv = Invoice(
        appointment_id=appt_id,
        invoice_number=invoice_number,
        client_name=client_name,
        client_email=client_email,
        amount_ttc=amount_ttc,
        vat_rate=vat_rate,
        amount_ht=amount_ht,
        amount_vat=amount_vat,
        invoice_date=appt.date,
        notes=payload.notes,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return _invoice_to_dict(inv)


@router.get("/{inv_id}")
def get_invoice(inv_id: int, request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
    if not inv:
        raise HTTPException(404, "Facture introuvable")
    return _invoice_to_dict(inv)


@router.get("/{inv_id}/pdf")
def download_pdf(inv_id: int, request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
    if not inv:
        raise HTTPException(404, "Facture introuvable")
    try:
        pdf_bytes = generate_invoice_pdf(_build_pdf_data(inv))
    except Exception as exc:
        raise HTTPException(500, f"Erreur génération PDF : {exc}")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{inv.invoice_number}.pdf"'},
    )


@router.patch("/{inv_id}/validate")
def validate_invoice(inv_id: int, request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
    if not inv:
        raise HTTPException(404, "Facture introuvable")
    if inv.status != "draft":
        raise HTTPException(400, "Seul un brouillon peut être validé")
    inv.status = "validated"
    inv.validated_at = datetime.utcnow()
    db.commit()
    db.refresh(inv)
    return _invoice_to_dict(inv)


@router.post("/{inv_id}/send")
def send_invoice(inv_id: int, request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
    if not inv:
        raise HTTPException(404, "Facture introuvable")
    if inv.status not in ("validated", "sent"):
        raise HTTPException(400, "La facture doit être validée avant envoi")
    if not inv.client_email:
        raise HTTPException(400, "Aucun email client — envoi impossible")
    if not RESEND_API_KEY:
        raise HTTPException(503, "Service email non configuré (RESEND_API_KEY manquant)")

    try:
        pdf_bytes = generate_invoice_pdf(_build_pdf_data(inv))
    except Exception as exc:
        raise HTTPException(500, f"Erreur génération PDF : {exc}")

    try:
        import resend
        resend.api_key = RESEND_API_KEY
        resend.Emails.send({
            "from": RESEND_FROM,
            "to": [inv.client_email],
            "subject": f"Votre facture {inv.invoice_number} — {BUSINESS_NAME}",
            "html": _invoice_email_html(inv),
            "attachments": [{
                "filename": f"{inv.invoice_number}.pdf",
                "content": list(pdf_bytes),
            }],
        })
    except Exception as exc:
        raise HTTPException(500, f"Erreur envoi email : {exc}")

    inv.status = "sent"
    inv.sent_at = datetime.utcnow()
    db.commit()
    db.refresh(inv)
    return _invoice_to_dict(inv)


@router.patch("/{inv_id}/paid")
def mark_paid(inv_id: int, request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
    if not inv:
        raise HTTPException(404, "Facture introuvable")
    if inv.status not in ("validated", "sent"):
        raise HTTPException(400, "Statut invalide pour marquer comme payée")
    inv.status = "paid"
    inv.paid_at = datetime.utcnow()
    db.commit()
    db.refresh(inv)
    return _invoice_to_dict(inv)


@router.delete("/{inv_id}", status_code=204)
def delete_invoice(inv_id: int, request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
    if not inv:
        raise HTTPException(404, "Facture introuvable")
    if inv.status != "draft":
        raise HTTPException(400, "Seul un brouillon peut être supprimé")
    db.delete(inv)
    db.commit()
    return None
