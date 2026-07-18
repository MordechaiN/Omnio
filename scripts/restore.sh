#!/usr/bin/env bash
# Restore the database and storage volume from a backup pair produced by backup.sh.
# Usage: scripts/restore.sh <omnio_db_TIMESTAMP.sql.gz> <omnio_storage_TIMESTAMP.tar.gz>
#   COMPOSE_FILE  override compose file (default: docker/compose.yaml)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker/compose.yaml}"
DB_BACKUP=${1:?"Usage: scripts/restore.sh <db-backup.sql.gz> <storage-backup.tar.gz>"}
STORAGE_BACKUP=${2:?"Usage: scripts/restore.sh <db-backup.sql.gz> <storage-backup.tar.gz>"}

[[ -f "$DB_BACKUP" ]] || { echo "Error: $DB_BACKUP not found"; exit 1; }
[[ -f "$STORAGE_BACKUP" ]] || { echo "Error: $STORAGE_BACKUP not found"; exit 1; }

echo "WARNING: this overwrites the current omnio database and storage volume."
read -r -p "Type 'yes' to confirm: " CONFIRM
[[ "$CONFIRM" == "yes" ]] || { echo "Aborted."; exit 1; }

echo "→ Stopping api and worker (keep postgres/redis up for the restore)"
docker compose -f "$COMPOSE_FILE" stop api worker

echo "→ Restoring database"
zcat "$DB_BACKUP" | docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U omnio -d omnio

echo "→ Restoring storage volume"
STAGE=$(mktemp -d)
tar -xzf "$STORAGE_BACKUP" -C "$STAGE"
docker compose -f "$COMPOSE_FILE" start api
sleep 3
docker compose -f "$COMPOSE_FILE" exec -T api sh -c 'rm -rf /data/* /data/.[!.]*' 2>/dev/null || true
docker compose -f "$COMPOSE_FILE" cp "$STAGE/data/." api:/data
rm -rf "$STAGE"

echo "→ Starting worker"
docker compose -f "$COMPOSE_FILE" start worker

"$ROOT_DIR/scripts/healthcheck.sh"

echo "Restore complete."
