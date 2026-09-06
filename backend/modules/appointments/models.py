from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, Time, func
from sqlalchemy.orm import relationship

from database import Base


class WorkingHours(Base):
    __tablename__ = "working_hours"

    id = Column(Integer, primary_key=True)
    day_of_week = Column(Integer, nullable=False, unique=True)  # 0=Lundi … 6=Dimanche
    open_time = Column(Time)
    close_time = Column(Time)
    is_open = Column(Boolean, nullable=False, default=True)
    address = Column(String(300))                               # adresse du jour (salon, domicile…)


class ClosedDay(Base):
    """Jour exceptionnellement fermé (congés, fériés, etc.)."""
    __tablename__ = "closed_days"

    id = Column(Integer, primary_key=True)
    date = Column(Date, unique=True, nullable=False)
    reason = Column(String(200))


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # null = RDV manuel admin
    manual_client_name = Column(String(200))   # utilisé si client_id est null
    manual_client_phone = Column(String(20))
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    total_price = Column(Numeric(8, 2), nullable=False)
    status = Column(String(50), nullable=False, default="pending")  # pending | confirmed | cancelled
    notes = Column(Text)
    is_home_service = Column(Boolean, nullable=False, default=False)
    client_address = Column(String(300))
    home_service_surcharge = Column(Numeric(8, 2), nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    gcal_event_id = Column(String(255), nullable=True)

    client = relationship("User")
    items = relationship("AppointmentService", back_populates="appointment", cascade="all, delete-orphan")


class AppointmentService(Base):
    __tablename__ = "appointment_services"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)

    appointment = relationship("Appointment", back_populates="items")
    service = relationship("Service")
