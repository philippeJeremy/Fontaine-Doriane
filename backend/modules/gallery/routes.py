from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_admin

from .models import GalleryPhoto

router = APIRouter(prefix="/gallery", tags=["gallery"])


class PhotoBody(BaseModel):
    url: str
    caption: Optional[str] = None
    sort_order: int = 0


class PhotoPatch(BaseModel):
    caption: Optional[str] = None
    sort_order: Optional[int] = None


def _to_dict(p: GalleryPhoto) -> dict:
    return {
        "id": p.id,
        "url": p.url,
        "caption": p.caption,
        "sort_order": p.sort_order,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


@router.get("")
def list_photos(db: Session = Depends(get_db)):
    photos = db.query(GalleryPhoto).order_by(GalleryPhoto.sort_order, GalleryPhoto.created_at).all()
    return [_to_dict(p) for p in photos]


@router.post("", status_code=201)
def add_photo(request: Request, payload: PhotoBody, db: Session = Depends(get_db)):
    require_admin(request, db)
    p = GalleryPhoto(**payload.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return _to_dict(p)


@router.patch("/{photo_id}")
def update_photo(photo_id: int, request: Request, payload: PhotoPatch, db: Session = Depends(get_db)):
    require_admin(request, db)
    p = db.query(GalleryPhoto).filter(GalleryPhoto.id == photo_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Photo introuvable")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(p, field, value)
    db.commit()
    return _to_dict(p)


@router.delete("/{photo_id}")
def delete_photo(photo_id: int, request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    p = db.query(GalleryPhoto).filter(GalleryPhoto.id == photo_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Photo introuvable")
    db.delete(p)
    db.commit()
    return {"detail": "Photo supprimée"}
