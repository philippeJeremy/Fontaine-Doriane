import logging
import os
from typing import List

logger = logging.getLogger("email")

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM = os.getenv("RESEND_FROM", "Fontaine Doriane <noreply@example.com>")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")


def _send(to: str, subject: str, html: str) -> None:
    if not RESEND_API_KEY or not to:
        logger.warning("Email non envoyé — RESEND_API_KEY ou destinataire manquant")
        return
    try:
        import resend
        resend.api_key = RESEND_API_KEY
        resend.Emails.send({
            "from": RESEND_FROM,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        logger.info("Email envoyé à %s : %s", to, subject)
    except Exception as exc:
        logger.error("Erreur envoi email : %s", exc)


def send_appointment_confirmation(
    to_email: str,
    client_name: str,
    date_str: str,
    time_str: str,
    services: List[str],
    total: float,
) -> None:
    services_rows = "".join(f"<tr><td style='padding:4px 12px'>{s}</td></tr>" for s in services)
    html = f"""
    <div style="font-family:sans-serif;max-width:560px;margin:auto;color:#1c1917">
      <h2 style="color:#be185d">Votre rendez-vous est confirmé ✨</h2>
      <p>Bonjour {client_name},</p>
      <p>Nous avons le plaisir de confirmer votre rendez-vous chez <strong>Fontaine Doriane</strong> :</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <tr><td style="padding:4px 12px;font-weight:600">📅 Date</td><td style="padding:4px 12px">{date_str}</td></tr>
        <tr><td style="padding:4px 12px;font-weight:600">🕐 Heure</td><td style="padding:4px 12px">{time_str}</td></tr>
      </table>
      <p><strong>Prestations :</strong></p>
      <table style="border-collapse:collapse;width:100%">{services_rows}</table>
      <p style="font-size:1.1em;margin-top:16px"><strong>Total : {total:.2f} €</strong></p>
      <hr style="border:none;border-top:1px solid #fce7f3;margin:24px 0"/>
      <p style="color:#6b7280;font-size:.9em">En cas d'empêchement, merci de nous prévenir au moins 24h à l'avance.</p>
      <p>À très bientôt,<br/><strong>L'équipe Fontaine Doriane</strong></p>
    </div>
    """
    _send(to_email, "Confirmation de rendez-vous — Fontaine Doriane", html)


def send_appointment_notification(
    client_name: str,
    client_email: str,
    date_str: str,
    time_str: str,
    services: List[str],
    total: float,
) -> None:
    if not ADMIN_EMAIL:
        return
    services_list = ", ".join(services)
    html = f"""
    <div style="font-family:sans-serif;max-width:560px;margin:auto;color:#1c1917">
      <h2>Nouvelle demande de rendez-vous</h2>
      <p><strong>Client :</strong> {client_name} ({client_email})</p>
      <p><strong>Date :</strong> {date_str} à {time_str}</p>
      <p><strong>Prestations :</strong> {services_list}</p>
      <p><strong>Total :</strong> {total:.2f} €</p>
      <p>Connectez-vous à l'administration pour confirmer ou annuler ce rendez-vous.</p>
    </div>
    """
    _send(ADMIN_EMAIL, f"Nouveau RDV — {client_name} le {date_str}", html)
