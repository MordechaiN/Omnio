# syntax=docker/dockerfile:1
# Build context: repository root (see docker/compose.yaml).
# modgen (tooling/modgen) globs the whole monorepo to emit registries for
# web/api/worker together, so these images build the full repo rather than
# a per-app pruned subset — matches `pnpm build` at the repo root exactly.
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY . .
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate \
  && pnpm install --frozen-lockfile

FROM deps AS build
# Inlined into the client bundle at build time (Next.js NEXT_PUBLIC_* convention) —
# the image must be (re)built if the public API origin changes.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
# Build & release metadata — supplied by the release tooling, never hand-edited
# (docs/architecture/09-releases.md). NEXT_PUBLIC_* so the footer/About page can
# read them client-side; baked into the bundle at build, so this image is the
# single source of truth for "what version am I".
ARG OMNIO_VERSION=0.0.0-dev
ARG OMNIO_GIT_COMMIT=unknown
ARG OMNIO_GIT_BRANCH=unknown
ARG OMNIO_BUILD_DATE=unknown
ARG OMNIO_BUILD_NUMBER=unknown
ENV NEXT_PUBLIC_OMNIO_VERSION=${OMNIO_VERSION}
ENV NEXT_PUBLIC_OMNIO_COMMIT=${OMNIO_GIT_COMMIT}
ENV NEXT_PUBLIC_OMNIO_BRANCH=${OMNIO_GIT_BRANCH}
ENV NEXT_PUBLIC_OMNIO_BUILD_DATE=${OMNIO_BUILD_DATE}
ENV NEXT_PUBLIC_OMNIO_BUILD_NUMBER=${OMNIO_BUILD_NUMBER}
# `modgen`'s bin isn't symlinked by `pnpm install` until tooling/modgen/dist
# exists (pnpm skips bin-linking for build-artifact bins that aren't built
# yet) — build it first, relink, then build everything else.
RUN pnpm turbo build --filter=@omnio/modgen... \
  && pnpm install --frozen-lockfile --prefer-offline \
  && pnpm turbo build

# next.config.ts sets output:"standalone" — .next/standalone carries a
# minimal traced server + only the node_modules it actually needs.
FROM base AS runner
RUN addgroup -S omnio && adduser -S omnio -G omnio
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
RUN chown -R omnio:omnio /app
USER omnio
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
