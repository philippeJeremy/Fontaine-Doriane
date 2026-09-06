from sqlalchemy import Column, String
from database import Base


class AppSettings(Base):
    __tablename__ = "app_settings"

    key   = Column(String(100), primary_key=True)
    value = Column(String(500), nullable=False, default="")
