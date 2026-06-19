#!/bin/bash
# Restaurer la base depuis un fichier de backup
#
# Usage : ./restore_db.sh /srv/backups/salon/db_2025-01-15_0300.sql.gz

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_FILE="${1:-}"

if [[ -z "$BACKUP_FILE" ]]; then
    echo "Usage : $0 <fichier_backup.sql.gz>"
    echo ""
    echo "Backups disponibles :"
    ls -lht /srv/backups/salon/db_*.sql.gz 2>/dev/null || echo "  Aucun backup trouvé"
    exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "Erreur : fichier introuvable — $BACKUP_FILE"
    exit 1
fi

# Charger les variables d'environnement
set -a
source "$PROJECT_DIR/.env"
set +a

echo "[$(date)] Restauration depuis : $BACKUP_FILE"
echo "ATTENTION : cela va écraser la base '$POSTGRES_DB' actuelle."
read -r -p "Confirmer ? (oui/non) : " confirm

if [[ "$confirm" != "oui" ]]; then
    echo "Annulé."
    exit 0
fi

# Décompresser et restaurer
gunzip -c "$BACKUP_FILE" | \
    docker compose -f "$PROJECT_DIR/docker-compose.yaml" exec -T db \
    psql -U "$POSTGRES_USER" "$POSTGRES_DB"

echo "[$(date)] Restauration terminée."
