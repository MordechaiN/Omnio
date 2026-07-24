#!/bin/sh
# Refuse to build an image that would lie about what it is.
#
# Release metadata is computed on the host by tooling/release/build-metadata.mjs
# and passed in as build args — `.git` is excluded from the Docker context, so
# the image cannot derive these itself (docs/architecture/09-releases.md §2).
# A missing arg used to fall back to `0.0.0-dev`/`unknown`, which shipped
# silently and made GET /api/version report a build that never existed. There is
# deliberately no fallback now: an incomplete build fails here instead.
set -eu

missing=0
for name in OMNIO_VERSION OMNIO_GIT_COMMIT OMNIO_GIT_BRANCH OMNIO_BUILD_DATE OMNIO_BUILD_NUMBER; do
  eval "value=\${$name-}"
  case "$value" in
    "" | unknown | 0.0.0-dev)
      printf 'ERROR: build arg %s is missing or a placeholder (got "%s").\n' "$name" "$value" >&2
      missing=1
      ;;
  esac
done

if [ "$missing" -ne 0 ]; then
  cat >&2 <<'MSG'

Omnio images must carry real release metadata; there is no fallback value.

Release through the official pipeline:

    ~/scripts/omnio-release

For a one-off build, compute the metadata first:

    eval "$(node tooling/release/build-metadata.mjs --export)"
    docker compose --env-file ~/.env.d/omnio.env -f ~/docker/omnio/compose.yml build

See docs/architecture/09-releases.md §2.
MSG
  exit 1
fi

printf 'build metadata ok: v%s (%s, branch %s, build %s, %s)\n' \
  "$OMNIO_VERSION" "$OMNIO_GIT_COMMIT" "$OMNIO_GIT_BRANCH" "$OMNIO_BUILD_NUMBER" "$OMNIO_BUILD_DATE"
