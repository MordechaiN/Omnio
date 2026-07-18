#!/usr/bin/env bash
# Back up the Postgres database and the storage volume.
# Usage: scripts/backup.sh [backup-dir]
#   COMPOSE_FILE  override compose file (default: docker/compose.yaml)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker/compose.yaml}"
BACKUP_DIR="${1:-$ROOT_DIR/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "→ Dumping database"
docker compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U omnio -d omnio --clean --if-exists \
  | gzip > "$BACKUP_DIR/omnio_db_${TIMESTAMP}.sql.gz"
echo "  Saved: $BACKUP_DIR/omnio_db_${TIMESTAMP}.sql.gz"

echo "→ Archiving storage volume (via api container, works for bind mounts and named volumes alike)"
STAGE="$BACKUP_DIR/.storage_${TIMESTAMP}"
mkdir -p "$STAGE"
docker compose -f "$COMPOSE_FILE" cp api:/data "$STAGE/data"
tar -czf "$BACKUP_DIR/omnio_storage_${TIMESTAMP}.tar.gz" -C "$STAGE" data
rm -rf "$STAGE"
echo "  Saved: $BACKUP_DIR/omnio_storage_${TIMESTAMP}.tar.gz"

find "$BACKUP_DIR" -name "omnio_*.gz" -mtime +30 -delete 2>/dev/null && echo "  Pruned backups older than 30 days"

echo "Backup complete."
