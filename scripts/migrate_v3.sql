-- Migration v3 — Gestion des factures
-- Idempotente (IF NOT EXISTS) — peut être rejouée sans risque.
--
-- Sur le serveur :
--   docker cp scripts/migrate_v3.sql fontaine-doriane-db-1:/tmp/
--   docker exec fontaine-doriane-db-1 psql -U $POSTGRES_USER -d $POSTGRES_DB -f /tmp/migrate_v3.sql

CREATE TABLE IF NOT EXISTS invoices (
    id              SERIAL          PRIMARY KEY,
    appointment_id  INTEGER         NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE RESTRICT,
    invoice_number  VARCHAR(20)     NOT NULL UNIQUE,
    client_name     VARCHAR(200)    NOT NULL,
    client_email    VARCHAR(255),
    amount_ttc      NUMERIC(10,2)   NOT NULL,
    vat_rate        NUMERIC(5,2)    NOT NULL DEFAULT 20,
    amount_ht       NUMERIC(10,2)   NOT NULL,
    amount_vat      NUMERIC(10,2)   NOT NULL,
    status          VARCHAR(20)     NOT NULL DEFAULT 'draft',
    notes           TEXT,
    invoice_date    DATE            NOT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    validated_at    TIMESTAMP,
    sent_at         TIMESTAMP,
    paid_at         TIMESTAMP
);
