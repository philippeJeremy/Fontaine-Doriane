import logging
import os

from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from sqlalchemy.orm import Session

from modules.settings.models import AppSettings

logger = logging.getLogger(__name__)

SCOPES      = ["https://www.googleapis.com/auth/calendar.events"]
CALENDAR_ID = "primary"


def _get(db: Session, key: str) -> str | None:
    row = db.query(AppSettings).filter(AppSettings.key == key).first()
    return row.value if row else None


def _set(db: Session, key: str, value: str) -> None:
    row = db.query(AppSettings).filter(AppSettings.key == key).first()
    if row:
        row.value = value
    else:
        db.add(AppSettings(key=key, value=value))


def get_credentials(db: Session) -> Credentials | None:
    refresh_token = _get(db, "gcal_refresh_token")
    if not refresh_token:
        return None
    creds = Credentials(
        token=None,  # toujours rafraîchi au premier appel
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes=SCOPES,
    )
    try:
        creds.refresh(GoogleRequest())
    except Exception as e:
        logger.error("gcal token refresh failed: %s", e)
        return None
    return creds


def create_event(db: Session, appt) -> str | None:
    creds = get_credentials(db)
    if not creds:
        return None
    try:
        service = build("calendar", "v3", credentials=creds, cache_discovery=False)
        if appt.client:
            name = f"{appt.client.first_name or ''} {appt.client.last_name or ''}".strip() or "Client"
        else:
            name = appt.manual_client_name or "Client"
        services_str = ", ".join(
            f"{it.service.name} ×{it.quantity}" if it.quantity > 1 else it.service.name
            for it in appt.items
        )
        date_str = appt.date.isoformat()
        event = {
            "summary": f"RDV – {name}",
            "description": f"{services_str}\nTotal : {float(appt.total_price):.2f} €",
            "start": {"dateTime": f"{date_str}T{appt.start_time.strftime('%H:%M:%S')}", "timeZone": "Europe/Paris"},
            "end":   {"dateTime": f"{date_str}T{appt.end_time.strftime('%H:%M:%S')}",   "timeZone": "Europe/Paris"},
        }
        result = service.events().insert(calendarId=CALENDAR_ID, body=event).execute()
        return result.get("id")
    except Exception as e:
        logger.error("gcal create_event failed: %s", e)
        return None


def delete_event(db: Session, event_id: str | None) -> bool:
    if not event_id:
        return False
    creds = get_credentials(db)
    if not creds:
        return False
    try:
        service = build("calendar", "v3", credentials=creds, cache_discovery=False)
        service.events().delete(calendarId=CALENDAR_ID, eventId=event_id).execute()
        return True
    except Exception as e:
        logger.error("gcal delete_event failed: %s", e)
        return False
