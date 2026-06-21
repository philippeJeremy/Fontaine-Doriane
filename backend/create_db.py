from datetime import time

from database import Base, engine

# Importer tous les modèles pour les enregistrer dans Base.metadata
from modules.users import models as _users  # noqa
from modules.services import models as _services  # noqa
from modules.gallery import models as _gallery  # noqa
from modules.appointments import models as _appointments  # noqa
from modules.settings import models as _settings  # noqa
from modules.invoices import models as _invoices  # noqa

from modules.appointments.models import WorkingHours
from modules.settings.models import AppSettings
from modules.services.models import Service 
from database import SessionLocal

Base.metadata.create_all(bind=engine)
print("Tables créées.")

# Seed des horaires par défaut (une seule fois si la table est vide)
db = SessionLocal()
try:
    if db.query(WorkingHours).count() == 0:
        defaults = [
            # Lundi → Samedi : 9h-19h
            WorkingHours(day_of_week=0, open_time=time(9, 0), close_time=time(19, 0), is_open=True),
            WorkingHours(day_of_week=1, open_time=time(9, 0), close_time=time(19, 0), is_open=True),
            WorkingHours(day_of_week=2, open_time=time(9, 0), close_time=time(19, 0), is_open=True),
            WorkingHours(day_of_week=3, open_time=time(9, 0), close_time=time(19, 0), is_open=True),
            WorkingHours(day_of_week=4, open_time=time(9, 0), close_time=time(19, 0), is_open=True),
            WorkingHours(day_of_week=5, open_time=time(9, 0), close_time=time(18, 0), is_open=True),
            # Dimanche : fermé
            WorkingHours(day_of_week=6, is_open=False),
        ]
        db.add_all(defaults)
        db.commit()
        print("Horaires par défaut insérés (Lun-Sam 9h-19h/18h, Dim fermé).")
    else:
        print("Horaires déjà configurés.")

    # Seed des paramètres globaux par défaut
    defaults_settings = [
        ("home_service_enabled",   "false"),
        ("home_service_surcharge", "0"),
    ]
    for key, value in defaults_settings:
        if not db.query(AppSettings).filter(AppSettings.key == key).first():
            db.add(AppSettings(key=key, value=value))
    db.commit()
    print("Paramètres globaux initialisés.")
finally:
    db.close()
