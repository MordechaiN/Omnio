#!/usr/bin/env bash
# Pull latest code and redeploy. Migrations run automatically on api boot.
# Usage: scripts/update.sh
#   COMPOSE_FILE  override compose file (default: docker/compose.yaml)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker/compose.yaml}"
ENV_FILE="$ROOT_DIR/.env"

cd "$ROOT_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: working tree has uncommitted changes. Commit, stash, or discard first."
  exit 1
fi

echo "→ Pulling latest main"
git pull --ff-only origin main

echo "→ Rebuilding and redeploying"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

echo "→ Pruning dangling images"
docker image prune -f >/dev/null

"$ROOT_DIR/scripts/healthcheck.sh"

echo "Update complete."
