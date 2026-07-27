#!/bin/sh
# Refuse to build an image that would lie about what it is.
#
# Release metadata is computed on the host by tooling/release/build-metadata.mjs
# and passed in as build args — `.git` is excluded from the Docker context, so
# the image cannot derive these itself (docs/architecture/09-releases.md §2).
# A missing arg used to fall back to `0.0.0-dev`/`unknown`, which shipped
# silently and made GET /api/version report a build that never existed.
#
# There are exactly two honest kinds of build, and this tells them apart:
#
#   1. A release build. Every field is supplied by the release tooling.
#   2. A source build. Nothing is supplied, and the image says so plainly —
#      version `0.0.0-source`. Someone who cloned the repository and ran the
#      command in the README gets this, and must not be stopped: an image that
#      admits it was built from source is not lying about anything. Refusing it
#      made the documented install impossible for everyone who is not us.
#
# What is refused is the dangerous middle: some fields supplied and others not,
# which means the release tooling ran and something went wrong.
set -eu

supplied=0
missing=0
missing_names=""

for name in OMNIO_VERSION OMNIO_GIT_COMMIT OMNIO_GIT_BRANCH OMNIO_BUILD_DATE OMNIO_BUILD_NUMBER; do
  eval "value=\${$name-}"
  case "$value" in
    "" | unknown | 0.0.0-dev | 0.0.0-source | source)
      missing=$((missing + 1))
      missing_names="$missing_names $name"
      ;;
    *)
      supplied=$((supplied + 1))
      ;;
  esac
done

if [ "$supplied" -eq 0 ]; then
  echo "no release metadata supplied — building as a source build (version 0.0.0-source)."
  echo "to build a release instead, see docs/architecture/09-releases.md."
  exit 0
fi

if [ "$missing" -ne 0 ]; then
  printf 'ERROR: incomplete release metadata. Missing or placeholder:%s\n' "$missing_names" >&2
  cat >&2 <<'MSG'

Some release metadata was supplied and some was not, so this build cannot say
honestly what it is. That is refused rather than guessed.

Either supply all of it:

    set -a && eval "$(node tooling/release/build-metadata.mjs)" && set +a
    docker compose -f docker/compose.yaml --env-file .env build

Or supply none of it, and get a clearly-labelled source build.

See docs/architecture/09-releases.md §2.
MSG
  exit 1
fi

printf 'build metadata ok: v%s (%s, branch %s, build %s, %s)\n' \
  "$OMNIO_VERSION" "$OMNIO_GIT_COMMIT" "$OMNIO_GIT_BRANCH" "$OMNIO_BUILD_NUMBER" "$OMNIO_BUILD_DATE"
