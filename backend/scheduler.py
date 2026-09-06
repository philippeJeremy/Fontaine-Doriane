import logging
from datetime import date, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import joinedload

from database import SessionLocal
from email_service import send_appointment_reminder
from modules.appointments.models import Appointment, AppointmentService

logger = logging.getLogger("scheduler")


def send_tomorrow_reminders() -> None:
    tomorrow = date.today() + timedelta(days=1)
    db = SessionLocal()
    try:
        appts = (
            db.query(Appointment)
            .options(
                joinedload(Appointment.client),
                joinedload(Appointment.items).joinedload(AppointmentService.service),
            )
            .filter(
                Appointment.date == tomorrow,
                Appointment.status == "confirmed",
            )
            .all()
        )
        logger.info("Rappels J-1 : %d rendez-vous pour le %s", len(appts), tomorrow)
        for appt in appts:
            if appt.client and appt.client.email:
                client_name = (
                    f"{appt.client.first_name or ''} {appt.client.last_name or ''}".strip()
                    or appt.client.email
                )
                services = [
                    f"{item.service.name} × {item.quantity}" if item.quantity > 1 else item.service.name
                    for item in appt.items
                ]
                send_appointment_reminder(
                    to_email=appt.client.email,
                    client_name=client_name,
                    date_str=tomorrow.strftime("%d/%m/%Y"),
                    time_str=appt.start_time.strftime("%H:%M"),
                    services=services,
                    total=float(appt.total_price),
                )
    except Exception as exc:
        logger.error("Erreur rappels J-1 : %s", exc)
    finally:
        db.close()


def start_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone="Europe/Paris")
    scheduler.add_job(send_tomorrow_reminders, "cron", hour=18, minute=0)
    scheduler.start()
    logger.info("Scheduler démarré — rappels J-1 tous les jours à 18h00")
    return scheduler
