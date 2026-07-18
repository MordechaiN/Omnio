#!/usr/bin/env bash
# Verify every service is up and its health endpoint is green.
# Usage: scripts/healthcheck.sh
#   COMPOSE_FILE  override compose file (default: docker/compose.yaml)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker/compose.yaml}"

FAIL=0

echo "=== Container health ==="
while read -r service status; do
  printf "  %-10s %s\n" "$service" "$status"
  [[ "$status" != "healthy" && "$status" != "running" ]] && FAIL=1
done < <(docker compose -f "$COMPOSE_FILE" ps --format '{{.Service}} {{.Health}}' 2>/dev/null)

echo "=== Endpoint checks ==="
check() {
  local label=$1 cmd=$2
  if eval "$cmd" >/dev/null 2>&1; then
    echo "  ✓ $label"
  else
    echo "  ✗ $label"
    FAIL=1
  fi
}

check "api /healthz"    "docker compose -f '$COMPOSE_FILE' exec -T api node -e \"fetch('http://127.0.0.1:4000/healthz').then(r=>process.exit(r.ok?0:1))\""
check "api /readyz"     "docker compose -f '$COMPOSE_FILE' exec -T api node -e \"fetch('http://127.0.0.1:4000/readyz').then(r=>process.exit(r.ok?0:1))\""
check "worker /readyz"  "docker compose -f '$COMPOSE_FILE' exec -T worker node -e \"fetch('http://127.0.0.1:4100/readyz').then(r=>process.exit(r.ok?0:1))\""
check "web /"            "docker compose -f '$COMPOSE_FILE' exec -T web node -e \"fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1))\""
check "postgres"        "docker compose -f '$COMPOSE_FILE' exec -T postgres pg_isready -U omnio -d omnio"
check "redis"           "docker compose -f '$COMPOSE_FILE' exec -T redis redis-cli ping"

if [[ "$FAIL" -eq 0 ]]; then
  echo "All checks passed."
else
  echo "One or more checks failed." >&2
fi
exit "$FAIL"
