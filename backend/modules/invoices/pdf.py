import os
from datetime import date as _date

from fpdf import FPDF

_SAUGE = (74, 85, 47)
_GRAY = (120, 120, 120)

# Polices DejaVu installées via fonts-dejavu-core (apt)
_FONT_DIR = "/usr/share/fonts/truetype/dejavu"
_FONT_REG  = f"{_FONT_DIR}/DejaVuSans.ttf"
_FONT_BOLD = f"{_FONT_DIR}/DejaVuSans-Bold.ttf"


def _biz() -> dict:
    return {
        "name":    os.getenv("BUSINESS_NAME",    "Les Ongles de Doriane"),
        "address": os.getenv("BUSINESS_ADDRESS", ""),
        "phone":   os.getenv("BUSINESS_PHONE",   ""),
        "email":   os.getenv("BUSINESS_EMAIL",   ""),
        "siret":   os.getenv("BUSINESS_SIRET",   ""),
    }


def _make_pdf() -> FPDF:
    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.add_font("DJ",  "",  _FONT_REG,  uni=True)
    pdf.add_font("DJ",  "B", _FONT_BOLD, uni=True)
    return pdf


def generate_invoice_pdf(data: dict) -> bytes:
    """
    data keys: invoice_number, invoice_date (DD/MM/YYYY), client_name, client_email,
               appt_date (DD/MM/YYYY), appt_time (HH:MM),
               services: [{name, quantity, price_ttc}],
               home_service_surcharge, amount_ht, vat_rate, amount_vat, amount_ttc, notes
    """
    biz = _biz()

    pdf = _make_pdf()
    pdf.add_page()
    pdf.set_margins(20, 20, 20)
    pdf.set_auto_page_break(auto=True, margin=25)

    # ── En-tête entreprise ────────────────────────────────────────────────────────
    pdf.set_font("DJ", "B", 20)
    pdf.set_text_color(*_SAUGE)
    pdf.cell(170, 10, biz["name"], ln=True)

    pdf.set_font("DJ", "", 9)
    pdf.set_text_color(*_GRAY)
    for line in filter(None, [biz["address"], biz["phone"], biz["email"]]):
        pdf.cell(170, 4, line, ln=True)
    if biz["siret"]:
        pdf.cell(170, 4, f"SIRET : {biz['siret']}", ln=True)

    pdf.ln(4)
    pdf.set_draw_color(*_SAUGE)
    pdf.set_line_width(0.5)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(8)

    # ── Bloc client (gauche) + N° facture (droite) ────────────────────────────────
    y0 = pdf.get_y()

    pdf.set_xy(20, y0)
    pdf.set_font("DJ", "B", 8)
    pdf.set_text_color(*_GRAY)
    pdf.cell(85, 5, "FACTURE POUR")

    pdf.set_xy(20, y0 + 7)
    pdf.set_font("DJ", "B", 13)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(85, 7, data["client_name"])

    if data.get("client_email"):
        pdf.set_xy(20, y0 + 15)
        pdf.set_font("DJ", "", 9)
        pdf.set_text_color(*_GRAY)
        pdf.cell(85, 5, data["client_email"])

    pdf.set_xy(115, y0)
    pdf.set_font("DJ", "B", 8)
    pdf.set_text_color(*_GRAY)
    pdf.cell(75, 5, "N° DE FACTURE", align="R")

    pdf.set_xy(115, y0 + 7)
    pdf.set_font("DJ", "B", 14)
    pdf.set_text_color(*_SAUGE)
    pdf.cell(75, 7, data["invoice_number"], align="R")

    pdf.set_xy(115, y0 + 16)
    pdf.set_font("DJ", "", 9)
    pdf.set_text_color(60, 60, 60)
    pdf.cell(75, 5, f"Date : {data['invoice_date']}", align="R")

    pdf.set_xy(115, y0 + 22)
    pdf.cell(75, 5, f"RDV : {data['appt_date']} à {data['appt_time']}", align="R")

    pdf.set_y(max(y0 + 32, pdf.get_y() + 5))
    pdf.ln(5)

    # ── Tableau des prestations ───────────────────────────────────────────────────
    # Largeurs colonnes : nom=93, qté=17, pu=30, total=30  → 170mm
    COL = (93, 17, 30, 30)

    pdf.set_fill_color(*_SAUGE)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("DJ", "B", 9)
    pdf.set_x(20)
    pdf.cell(COL[0], 8, "  DÉSIGNATION", fill=True, border=0, ln=False)
    pdf.cell(COL[1], 8, "QTÉ",           fill=True, border=0, align="C", ln=False)
    pdf.cell(COL[2], 8, "P.U. TTC",      fill=True, border=0, align="R", ln=False)
    pdf.cell(COL[3], 8, "TOTAL TTC",     fill=True, border=0, align="R", ln=True)

    pdf.set_font("DJ", "", 9)
    for i, svc in enumerate(data["services"]):
        pdf.set_fill_color(248, 248, 244) if i % 2 == 0 else pdf.set_fill_color(255, 255, 255)
        pdf.set_text_color(40, 40, 40)
        line_total = svc["price_ttc"] * svc["quantity"]
        pdf.set_x(20)
        pdf.cell(COL[0], 7, f"  {svc['name']}",               fill=True, border=0, ln=False)
        pdf.cell(COL[1], 7, str(svc["quantity"]),              fill=True, border=0, align="C", ln=False)
        pdf.cell(COL[2], 7, f"{svc['price_ttc']:.2f} €",      fill=True, border=0, align="R", ln=False)
        pdf.cell(COL[3], 7, f"{line_total:.2f} €",            fill=True, border=0, align="R", ln=True)

    surcharge = float(data.get("home_service_surcharge", 0))
    if surcharge > 0:
        n = len(data["services"])
        pdf.set_fill_color(248, 248, 244) if n % 2 == 0 else pdf.set_fill_color(255, 255, 255)
        pdf.set_text_color(40, 40, 40)
        pdf.set_x(20)
        pdf.cell(COL[0], 7, "  Supplément déplacement à domicile", fill=True, border=0, ln=False)
        pdf.cell(COL[1], 7, "1",                fill=True, border=0, align="C", ln=False)
        pdf.cell(COL[2], 7, f"{surcharge:.2f} €", fill=True, border=0, align="R", ln=False)
        pdf.cell(COL[3], 7, f"{surcharge:.2f} €", fill=True, border=0, align="R", ln=True)

    pdf.ln(6)

    # ── Totaux (alignés à droite) ─────────────────────────────────────────────────
    def total_row(label: str, value: float, bold: bool = False, color=None) -> None:
        c = color or (50, 50, 50)
        pdf.set_font("DJ", "B" if bold else "", 10 if bold else 9)
        pdf.set_text_color(*c)
        pdf.set_x(115)
        pdf.cell(45, 7, label, ln=False)
        pdf.cell(30, 7, f"{value:.2f} €", align="R", ln=True)

    total_row("Montant HT :", float(data["amount_ht"]))
    vat_rate = float(data["vat_rate"])
    label_tva = "TVA non applicable :" if vat_rate == 0 else f"TVA ({vat_rate:.0f}%) :"
    total_row(label_tva, float(data["amount_vat"]))

    pdf.set_draw_color(*_SAUGE)
    pdf.set_line_width(0.4)
    y_sep = pdf.get_y()
    pdf.line(115, y_sep, 190, y_sep)
    pdf.ln(1)

    total_row("TOTAL TTC :", float(data["amount_ttc"]), bold=True, color=_SAUGE)

    # ── Mention légale TVA franchise ─────────────────────────────────────────────
    if vat_rate == 0:
        pdf.ln(3)
        pdf.set_x(20)
        pdf.set_font("DJ", "", 7)
        pdf.set_text_color(*_GRAY)
        pdf.cell(170, 4, "TVA non applicable, article 293 B du CGI", ln=True)

    # ── Notes ─────────────────────────────────────────────────────────────────────
    if data.get("notes"):
        pdf.ln(8)
        pdf.set_x(20)
        pdf.set_font("DJ", "B", 9)
        pdf.set_text_color(*_GRAY)
        pdf.cell(170, 5, "Notes :", ln=True)
        pdf.set_x(20)
        pdf.set_font("DJ", "", 9)
        pdf.set_text_color(60, 60, 60)
        pdf.multi_cell(170, 5, data["notes"])

    # ── Pied de page ──────────────────────────────────────────────────────────────
    pdf.set_y(-22)
    pdf.set_draw_color(200, 200, 200)
    pdf.set_line_width(0.3)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(3)
    pdf.set_font("DJ", "", 7)
    pdf.set_text_color(170, 170, 170)
    today = _date.today().strftime("%d/%m/%Y")
    pdf.cell(170, 4, f"Document généré le {today} — {biz['name']}", align="C", ln=True)

    return bytes(pdf.output())
