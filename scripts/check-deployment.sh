#!/usr/bin/env bash
# Is the running instance actually the code we think it is?
#
# This exists because the answer was "no" twice. Once the deployed image was 34
# hours old while every file in the repository said otherwise. Once the fix for
# a dead-end 404 sat in main for a day while visitors kept meeting the dead end.
# Both times it was found by accident, and both times the repository looked
# perfect — because a repository cannot tell you what is running.
#
# Usage: scripts/check-deployment.sh [url]
#   url  where the instance is (default http://127.0.0.1:4200)
# Exit:  0 the instance matches this checkout · 1 it does not, or is unreachable
set -uo pipefail

URL="${1:-http://127.0.0.1:4200}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

version_json=$(curl -sf --max-time 10 "$URL/api/version" 2>/dev/null)
if [[ -z "$version_json" ]]; then
  echo "Cannot reach $URL/api/version — nothing to compare." >&2
  exit 1
fi

read -r deployed_commit deployed_version deployed_build <<<"$(
  node -e '
    let raw = "";
    process.stdin.on("data", (c) => (raw += c)).on("end", () => {
      const d = JSON.parse(raw);
      process.stdout.write([d.commit, d.version, d.buildNumber].join(" "));
    });
  ' <<<"$version_json"
)"

local_commit=$(git rev-parse --short HEAD)
local_version=$(node -e "process.stdout.write(require('./package.json').version)")

printf "  deployed   %s  %s  build %s\n" "$deployed_version" "$deployed_commit" "$deployed_build"
printf "  this tree  %s  %s\n" "$local_version" "$local_commit"

if [[ "$deployed_commit" == "$local_commit" ]]; then
  echo "  In step."
  exit 0
fi

# Behind is the dangerous direction: fixes that exist and reach nobody.
if git merge-base --is-ancestor "$deployed_commit" HEAD 2>/dev/null; then
  behind=$(git rev-list --count "$deployed_commit"..HEAD 2>/dev/null)
  echo
  echo "  The running instance is $behind commit(s) behind this checkout." >&2
  echo "  Everything committed since $deployed_commit is reaching nobody:" >&2
  git log --oneline "$deployed_commit"..HEAD 2>/dev/null | sed 's/^/    /' >&2
else
  echo
  echo "  The running instance is not an ancestor of this checkout — it was" >&2
  echo "  built from a different branch or a tree that no longer exists." >&2
fi
exit 1
