from sqlalchemy import Column, DateTime, Integer, String, func

from database import Base


class GalleryPhoto(Base):
    __tablename__ = "gallery_photos"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(500), nullable=False)
    caption = Column(String(500))
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
