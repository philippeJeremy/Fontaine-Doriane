from sqlalchemy import Boolean, Column, Integer, Numeric, String, Text

from database import Base


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    price = Column(Numeric(8, 2), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    category = Column(String(100), nullable=False, default="Soin")
    image_url = Column(String(500))
    is_active = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)
