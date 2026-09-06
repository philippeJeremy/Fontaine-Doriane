from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import backref, relationship

from database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=False, unique=True)
    invoice_number = Column(String(20), unique=True, nullable=False)

    client_name = Column(String(200), nullable=False)
    client_email = Column(String(255))

    amount_ttc = Column(Numeric(10, 2), nullable=False)
    vat_rate = Column(Numeric(5, 2), nullable=False, default=20)
    amount_ht = Column(Numeric(10, 2), nullable=False)
    amount_vat = Column(Numeric(10, 2), nullable=False)

    status = Column(String(20), nullable=False, default="draft")  # draft|validated|sent|paid
    notes = Column(Text)

    invoice_date = Column(Date, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    validated_at = Column(DateTime)
    sent_at = Column(DateTime)
    paid_at = Column(DateTime)

    appointment = relationship("Appointment", backref=backref("invoice", uselist=False))
