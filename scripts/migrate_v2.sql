-- Migration v2 — toutes les évolutions depuis la mise en prod initiale
-- Idempotente (IF NOT EXISTS) — peut être rejouée sans risque.
--
-- Sur le serveur :
--   docker cp scripts/migrate_v2.sql fontaine-doriane-db-1:/tmp/
--   docker exec fontaine-doriane-db-1 psql -U $POSTGRES_USER -d $POSTGRES_DB -f /tmp/migrate_v2.sql

-- 1. Adresse par jour de travail
ALTER TABLE working_hours
    ADD COLUMN IF NOT EXISTS address VARCHAR(300);

-- 2. Champs prestation à domicile sur les rendez-vous
ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS is_home_service        BOOLEAN      NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS client_address         VARCHAR(300),
    ADD COLUMN IF NOT EXISTS home_service_surcharge NUMERIC(8,2) NOT NULL DEFAULT 0;

-- 3. Paramètres globaux
CREATE TABLE IF NOT EXISTS app_settings (
    key   VARCHAR(100) PRIMARY KEY,
    value VARCHAR(500) NOT NULL DEFAULT ''
);
INSERT INTO app_settings (key, value) VALUES
    ('home_service_enabled',   'false'),
    ('home_service_surcharge', '0')
ON CONFLICT (key) DO NOTHING;

-- 4. Images multiples sur les prestations (jusqu'à 3)
ALTER TABLE services
    ADD COLUMN IF NOT EXISTS image_url_2 VARCHAR(500),
    ADD COLUMN IF NOT EXISTS image_url_3 VARCHAR(500);

-- 5. Connexion sociale (Google / Facebook)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS google_id   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_google_id_key') THEN
        ALTER TABLE users ADD CONSTRAINT users_google_id_key UNIQUE (google_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_facebook_id_key') THEN
        ALTER TABLE users ADD CONSTRAINT users_facebook_id_key UNIQUE (facebook_id);
    END IF;
END $$;

ALTER TABLE users
    ALTER COLUMN hashed_password DROP NOT NULL;
