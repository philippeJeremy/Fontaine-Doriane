#!/bin/bash
# Backup PostgreSQL + uploads — à lancer via cron chaque nuit

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="/home/ubuntu/backup_db"
DATE=$(date +%Y-%m-%d_%H%M)
KEEP_DAYS=30

mkdir -p "$BACKUP_DIR"

# Charger les variables d'environnement
set -a
source "$PROJECT_DIR/.env"
set +a

echo "[$(date)] Début du backup..."

# ── 1. Dump PostgreSQL ────────────────────────────────────────────────────────
DB_FILE="$BACKUP_DIR/db_${DATE}.sql.gz"

docker compose -f "$PROJECT_DIR/docker-compose.yaml" exec -T db \
    pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
    | gzip > "$DB_FILE"

echo "[$(date)] Base de données sauvegardée : $DB_FILE ($(du -sh "$DB_FILE" | cut -f1))"

# ── 2. Archive des uploads ────────────────────────────────────────────────────
UPLOADS_FILE="$BACKUP_DIR/uploads_${DATE}.tar.gz"

docker run --rm \
    -v salon_uploads_data:/data \
    -v "$BACKUP_DIR":/backup \
    alpine tar czf "/backup/uploads_${DATE}.tar.gz" -C /data .

echo "[$(date)] Uploads sauvegardés : $UPLOADS_FILE ($(du -sh "$UPLOADS_FILE" | cut -f1))"

# ── 3. Rotation — supprime les backups de plus de KEEP_DAYS jours ─────────────
find "$BACKUP_DIR" -name "db_*.sql.gz"       -mtime +$KEEP_DAYS -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz"  -mtime +$KEEP_DAYS -delete

echo "[$(date)] Backup terminé. Fichiers conservés :"
ls -lh "$BACKUP_DIR" | tail -10
