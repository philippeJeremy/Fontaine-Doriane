import logging
import os
from logging.handlers import RotatingFileHandler

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from limiter import limiter
from modules.appointments import routes as appointments
from modules.calendar import routes as calendar
from modules.gallery import routes as gallery
from modules.invoices import routes as invoices
from modules.services import routes as services
from modules.settings import routes as settings
from modules.uploads import routes as uploads
from modules.users import oauth as oauth_users
from modules.users import routes as users

STATIC_DIR = "/app/static"
os.makedirs(os.path.join(STATIC_DIR, "uploads"), exist_ok=True)

LOG_DIR = os.getenv("LOG_DIR", "/app/logs")
os.makedirs(LOG_DIR, exist_ok=True)

_FMT = "%(asctime)s %(levelname)s %(name)s %(message)s"
_formatter = logging.Formatter(_FMT)


def _rotating(filename: str) -> RotatingFileHandler:
    h = RotatingFileHandler(
        os.path.join(LOG_DIR, filename),
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    h.setFormatter(_formatter)
    return h


_console = logging.StreamHandler()
_console.setFormatter(_formatter)

logging.basicConfig(level=logging.INFO, handlers=[_console, _rotating("app.log")])

_audit_logger = logging.getLogger("audit")
_audit_logger.addHandler(_rotating("audit.log"))

logger = logging.getLogger("api")

app = FastAPI(title="Fontaine Doriane API", version="1.0.0", docs_url=None, redoc_url=None)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Requested-With", "Authorization"],
)

@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    # Uploads : 10 Mo — tout le reste : 1 Mo
    limit = 10 * 1024 * 1024 if request.url.path.startswith("/uploads") else 1 * 1024 * 1024
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > limit:
        return JSONResponse({"detail": "Requête trop volumineuse"}, status_code=413)
    return await call_next(request)


@app.middleware("http")
async def access_log(request: Request, call_next):
    response = await call_next(request)
    ip = request.client.host if request.client else "unknown"
    logger.info(
        "ACCESS method=%s path=%s status=%s ip=%s",
        request.method, request.url.path, response.status_code, ip,
    )
    return response


app.include_router(users.router)
app.include_router(oauth_users.router)
app.include_router(services.router)
app.include_router(gallery.router)
app.include_router(appointments.router)
app.include_router(calendar.router)
app.include_router(settings.router)
app.include_router(uploads.router)
app.include_router(invoices.router)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/health")
def health():
    return {"status": "ok"}
