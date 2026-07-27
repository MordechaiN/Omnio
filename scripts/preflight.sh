#!/usr/bin/env bash
# Everything about a release that a machine can check faster and more reliably
# than a person. Run before inviting anyone (docs/private-beta-checklist.md).
#
# Every check here exists because the thing it checks was once broken and
# nothing caught it. Adding a check is how a bug becomes a bug that only ever
# happens once.
#
# Usage: scripts/preflight.sh
# Exit:  0 all clear · 1 something would reach a user broken
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FAIL=0
pass() { printf "  \033[32m✓\033[0m %s\n" "$1"; }
fail() { printf "  \033[31m✗\033[0m %s\n" "$1"; [ -n "${2:-}" ] && printf "      %s\n" "$2"; FAIL=1; }

echo "=== Install path ==="

# The documented install command must parse. A ": " inside an unquoted YAML
# scalar once made this file unparseable for months; every reader of the README
# hit it in their first minute, and nothing in CI looked at it.
for f in docker/compose.yaml docker/compose.dev.yaml; do
  if OMNIO_SESSION_SECRET=preflight docker compose -f "$f" config >/dev/null 2>&1; then
    pass "$f parses"
  else
    fail "$f does not parse" "$(OMNIO_SESSION_SECRET=preflight docker compose -f "$f" config 2>&1 | head -1)"
  fi
done

# Missing secret must fail loudly, at the right moment, with a usable message.
# Captured to a variable rather than piped into `grep -q`: grep exits on the
# first match, docker compose dies of SIGPIPE, and `pipefail` then reports a
# failure that never happened. The first version of this check did exactly that
# and accused a working guard of being broken.
secret_check=$(docker compose -f docker/compose.yaml config 2>&1)
if [[ "$secret_check" == *OMNIO_SESSION_SECRET* ]]; then
  pass "a missing session secret is refused by name"
else
  fail "a missing session secret is not clearly refused"
fi

# A stranger with a clone and no release tooling must be able to build.
if sh docker/images/require-build-metadata.sh >/dev/null 2>&1; then
  pass "a source build is allowed (the README install works)"
else
  fail "a source build is refused — the documented install is impossible"
fi

# ...but a half-supplied release must not be.
if OMNIO_VERSION=1.2.3 sh docker/images/require-build-metadata.sh >/dev/null 2>&1; then
  fail "incomplete release metadata is accepted — an image could lie about itself"
else
  pass "incomplete release metadata is refused"
fi

echo "=== Release surfaces ==="

# release.json is generated; a hand-edit or a missed regeneration is invisible
# until a user opens About and sees a version nobody shipped.
if [ -f release.json ]; then
  manifest_version=$(node -e "process.stdout.write(require('./release.json').version)" 2>/dev/null)
  package_version=$(node -e "process.stdout.write(require('./package.json').version)" 2>/dev/null)
  if [ "$manifest_version" = "$package_version" ]; then
    pass "release.json matches package.json ($manifest_version)"
  else
    fail "release.json says $manifest_version, package.json says $package_version"
  fi
else
  fail "release.json is missing"
fi

# Every shipped version needs notes a person can read, in every language.
notes="content/releases/${package_version}.json"
if [ -f "$notes" ]; then
  if node -e "
    const r = require('./$notes');
    const missing = [];
    for (const s of r.sections ?? [])
      for (const i of s.items ?? [])
        for (const l of ['en', 'he']) if (!i[l]) missing.push(s.type + '/' + l);
    if (!r.headline?.en || !r.headline?.he) missing.push('headline');
    if (missing.length) { console.error(missing.join(', ')); process.exit(1); }
  " 2>/dev/null; then
    pass "release notes for $package_version exist in both languages"
  else
    fail "release notes for $package_version are incomplete"
  fi
else
  fail "no release notes for $package_version" "expected $notes"
fi

echo "=== Language parity ==="

# A missing translation renders a raw key. CI enforces this too; it is repeated
# here because this script is what runs before a release, and a release with a
# raw key in it is the kind of thing testers screenshot.
if node -e "
  const en = require('./packages/i18n/src/messages/en.json');
  const he = require('./packages/i18n/src/messages/he.json');
  const walk = (a, b, path = '') => {
    const out = [];
    for (const k of Object.keys(a)) {
      const p = path ? path + '.' + k : k;
      if (!(k in b)) out.push(p);
      else if (a[k] && typeof a[k] === 'object') out.push(...walk(a[k], b[k], p));
    }
    return out;
  };
  const missing = [...walk(en, he), ...walk(he, en)];
  if (missing.length) { console.error(missing.slice(0, 8).join(', ')); process.exit(1); }
" 2>/dev/null; then
  pass "en and he have the same keys"
else
  fail "en/he key mismatch" "$(node -e "
    const en = require('./packages/i18n/src/messages/en.json');
    const he = require('./packages/i18n/src/messages/he.json');
    const walk = (a, b, path = '') => { const out = []; for (const k of Object.keys(a)) { const p = path ? path + '.' + k : k; if (!(k in b)) out.push(p); else if (a[k] && typeof a[k] === 'object') out.push(...walk(a[k], b[k], p)); } return out; };
    console.log([...walk(en, he), ...walk(he, en)].slice(0, 8).join(', '));
  " 2>/dev/null)"
fi

echo "=== Dead ends ==="

# A wrong address used to land on the framework's bare 404: no branding, no
# navigation, always English. Someone following a stale link could not tell
# whether Omnio had broken or their files were gone.
for f in "apps/web/src/app/[locale]/not-found.tsx" "apps/web/src/app/[locale]/error.tsx"; do
  if [ -f "$f" ]; then
    pass "$(basename "$f") exists"
  else
    fail "$f is missing — a wrong URL or a failed render is a dead end"
  fi
done

echo "=== Ports ==="
if ./scripts/check-ports.sh >/dev/null 2>&1; then
  pass "no port conflicts (7400-7449)"
else
  fail "an Omnio port is taken" "run scripts/check-ports.sh"
fi

echo "=== Dependencies ==="
if pnpm audit --prod >/dev/null 2>&1; then
  pass "no known vulnerabilities in what ships"
else
  fail "pnpm audit --prod reports advisories" "$(pnpm audit --prod 2>/dev/null | grep -ciE '^(critical|high|moderate)' || echo '?') findings"
fi

echo
if [ "$FAIL" -eq 0 ]; then
  echo "Preflight clear. The manual half of the checklist is in docs/private-beta-checklist.md."
else
  echo "Preflight found problems a user would meet. Fix them before inviting anyone." >&2
fi
exit "$FAIL"
