from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_admin

from .models import Service

router = APIRouter(prefix="/services", tags=["services"])


class ServiceBody(BaseModel):
    name: str
    description: Optional[str] = None
    price: Decimal
    duration_minutes: int
    category: str = "Soin"
    image_url: Optional[str] = None
    image_url_2: Optional[str] = None
    image_url_3: Optional[str] = None
    sort_order: int = 0


class ServicePatch(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    duration_minutes: Optional[int] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    image_url_2: Optional[str] = None
    image_url_3: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


def _to_dict(s: Service) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "description": s.description,
        "price": float(s.price),
        "duration_minutes": s.duration_minutes,
        "category": s.category,
        "image_url": s.image_url,
        "image_url_2": s.image_url_2,
        "image_url_3": s.image_url_3,
        "is_active": s.is_active,
        "sort_order": s.sort_order,
    }


@router.get("")
def list_services(db: Session = Depends(get_db)):
    rows = (
        db.query(Service)
        .filter(Service.is_active.is_(True))
        .order_by(Service.sort_order, Service.name)
        .all()
    )
    return [_to_dict(s) for s in rows]


@router.get("/all")
def list_all_services(request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    rows = db.query(Service).order_by(Service.sort_order, Service.name).all()
    return [_to_dict(s) for s in rows]


@router.post("", status_code=201)
def create_service(request: Request, payload: ServiceBody, db: Session = Depends(get_db)):
    require_admin(request, db)
    s = Service(**payload.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return _to_dict(s)


@router.put("/{service_id}")
def update_service(service_id: int, request: Request, payload: ServiceBody, db: Session = Depends(get_db)):
    require_admin(request, db)
    s = db.query(Service).filter(Service.id == service_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Prestation introuvable")
    for field, value in payload.model_dump().items():
        setattr(s, field, value)
    db.commit()
    return _to_dict(s)


@router.patch("/{service_id}")
def patch_service(service_id: int, request: Request, payload: ServicePatch, db: Session = Depends(get_db)):
    require_admin(request, db)
    s = db.query(Service).filter(Service.id == service_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Prestation introuvable")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(s, field, value)
    db.commit()
    return _to_dict(s)


@router.delete("/{service_id}")
def delete_service(service_id: int, request: Request, db: Session = Depends(get_db)):
    require_admin(request, db)
    s = db.query(Service).filter(Service.id == service_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Prestation introuvable")
    s.is_active = False
    db.commit()
    return {"detail": "Prestation désactivée"}
