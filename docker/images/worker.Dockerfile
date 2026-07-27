# syntax=docker/dockerfile:1
# Build context: repository root (see docker/compose.yaml).
# modgen (tooling/modgen) globs the whole monorepo to emit registries for
# web/api/worker together, so these images build the full repo rather than
# a per-app pruned subset — matches `pnpm build` at the repo root exactly.
#
# M7/M8 (worker-tier native tools: ffmpeg/imagemagick/qpdf/tesseract) are not
# built yet, so the sandbox image only needs Node — the hardened tool configs
# from docs/architecture/06-security.md §2 land in this file when M8 ships.
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY . .
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate \
  && pnpm install --frozen-lockfile

FROM deps AS build
# `modgen`'s bin isn't symlinked by `pnpm install` until tooling/modgen/dist
# exists (pnpm skips bin-linking for build-artifact bins that aren't built
# yet) — build it first, relink, then build everything else.
RUN pnpm turbo build --filter=@omnio/modgen... \
  && pnpm install --frozen-lockfile --prefer-offline \
  && pnpm turbo build

FROM base AS runner
# Server-side native engines for worker-tier tools (Omnio's hybrid model:
# heavyweight converters run here, never in the browser). LibreOffice powers
# Office → PDF; the fonts give faithful text rendering, including Hebrew.
RUN apk add --no-cache \
      libreoffice-writer \
      libreoffice-calc \
      libreoffice-impress \
      fontconfig \
      ttf-dejavu \
      font-noto \
      font-noto-hebrew
# Prebuild the system font cache as root (world-readable) so headless soffice —
# which runs with a scrubbed environment and no writable HOME — finds a valid
# cache instead of rescanning fonts on every conversion.
RUN fc-cache -f
RUN addgroup -S omnio && adduser -S omnio -G omnio
COPY --from=build --chown=omnio:omnio /app /app
USER omnio
ENV NODE_ENV=production
EXPOSE 7420
CMD ["node", "apps/worker/dist/main.js"]
