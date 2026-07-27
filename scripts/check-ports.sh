#!/usr/bin/env bash
# Report whether anything else on this machine already holds an Omnio port.
#
# Omnio owns 7400-7449 (docs/ports.md). Nothing should be listening on its
# ports before it starts. When something is, this says so by name, instead of
# an EADDRINUSE a minute into a build.
#
# Usage: scripts/check-ports.sh
# Exit:  0 all clear · 1 at least one port is taken
set -euo pipefail

# role:port — keep in step with docs/ports.md.
PORTS=(
  "web:7400"
  "api:7410"
  "worker health:7420"
  "postgres:7432"
  "redis:7479"
)

TAKEN=0

holder() {
  local port=$1
  # ss shows the process only for sockets this user owns; docker-proxy and other
  # users' listeners still show up as a listening socket, just unnamed.
  ss -ltnp 2>/dev/null | awk -v p=":$port\$" '$4 ~ p { $1=$2=$3=""; print; exit }' | sed 's/^ *//'
}

# Omnio's own dev stores holding their own ports is the normal state, not a
# conflict. A checker that fires when everything is fine gets ignored, and then
# it is no use on the day something really has taken a port.
ours() {
  docker ps --filter "label=com.docker.compose.project=omnio-dev" \
    --format '{{.Ports}}' 2>/dev/null | grep -q ":$1->"
}

echo "=== Omnio ports (7400-7449) ==="
for entry in "${PORTS[@]}"; do
  role="${entry%:*}"
  port="${entry##*:}"
  found=$(holder "$port")
  if [[ -z "$found" ]]; then
    printf "  free   %-14s %s\n" "$role" "$port"
  elif ours "$port"; then
    printf "  ours   %-14s %s   omnio-dev container\n" "$role" "$port"
  else
    printf "  TAKEN  %-14s %s   %s\n" "$role" "$port" "$found"
    TAKEN=1
  fi
done

if [[ "$TAKEN" -eq 0 ]]; then
  echo "No conflicts."
else
  cat >&2 <<'EOF'

One or more Omnio ports are already in use.

If it is a stray Omnio process from an earlier run, stop it. If it is another
project, it has taken a port from Omnio's range — that is worth fixing on their
side, because Omnio deliberately stays out of the popular defaults so that this
does not happen. docs/ports.md explains the range.
EOF
fi
exit "$TAKEN"
