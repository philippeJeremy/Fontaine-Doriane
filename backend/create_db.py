from datetime import time

from database import Base, engine

# Importer tous les modèles pour les enregistrer dans Base.metadata
from modules.users import models as _users  # noqa
from modules.services import models as _services  # noqa
from modules.gallery import models as _gallery  # noqa
from modules.appointments import models as _appointments  # noqa

from modules.appointments.models import WorkingHours
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
finally:
    db.close()
