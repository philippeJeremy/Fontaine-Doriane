import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_admin

router = APIRouter(prefix="/uploads", tags=["uploads"])

UPLOAD_DIR = "/app/static/uploads"
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE = 5 * 1024 * 1024  # 5 Mo


@router.post("/image")
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    require_admin(request, db)

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Format non supporté (jpeg, png, webp, gif uniquement)")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="Fichier trop volumineux (max 5 Mo)")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with open(os.path.join(UPLOAD_DIR, filename), "wb") as f:
        f.write(data)

    # URL préfixée /api/ pour passer par le proxy Vite (dev) et Caddy (prod)
    return {"url": f"/api/static/uploads/{filename}"}
