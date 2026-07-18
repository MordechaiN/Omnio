#!/usr/bin/env bash
# First-time setup: create .env if missing, build and start the full stack.
# Usage: scripts/bootstrap.sh
#   COMPOSE_FILE  override compose file (default: docker/compose.yaml)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker/compose.yaml}"
ENV_FILE="$ROOT_DIR/.env"

cd "$ROOT_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "→ Creating .env from .env.example"
  cp .env.example "$ENV_FILE"
  SECRET=$(openssl rand -hex 32)
  sed -i.bak "s#^OMNIO_SESSION_SECRET=.*#OMNIO_SESSION_SECRET=$SECRET#" "$ENV_FILE"
  rm -f "$ENV_FILE.bak"
  echo "  Generated a random OMNIO_SESSION_SECRET."
  echo "  Review $ENV_FILE (ports, allowed origins, storage limits) before continuing."
else
  echo "→ Using existing .env"
fi

echo "→ Building and starting the stack"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

echo "→ Waiting for services to report healthy"
for _ in $(seq 1 30); do
  UNHEALTHY=$(docker compose -f "$COMPOSE_FILE" ps --format '{{.Service}} {{.Health}}' | awk '$2!="healthy"{print $1}')
  [[ -z "$UNHEALTHY" ]] && break
  sleep 2
done

"$ROOT_DIR/scripts/healthcheck.sh" || true

echo ""
echo "Bootstrap complete. web on \$WEB_PORT, api on \$API_PORT (see $ENV_FILE)."
