# syntax=docker/dockerfile:1
# Build context: repository root (see docker/compose.yaml).
#
# Two concerns pull in opposite directions here:
#   - modgen (tooling/modgen) globs the *whole* monorepo to emit registries
#     for web/api/worker together, so the build has to see every package.
#   - the runtime image should only carry @omnio/api's actual dependency
#     graph (not web's Next.js, Storybook, Playwright, etc.) or it balloons
#     to 2GB+.
# So: build once against the full repo, but assemble the runtime node_modules
# from a `turbo prune`'d, --prod-only install of just the api's graph.
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g turbo@2.5.0
WORKDIR /app

# ---- full-repo build (needed for modgen codegen) ----
FROM base AS deps
COPY . .
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate \
  && pnpm install --frozen-lockfile

FROM deps AS build
# Build & release metadata — supplied by the release tooling (docs/architecture/09-releases.md).
ARG OMNIO_VERSION
ARG OMNIO_GIT_COMMIT
ARG OMNIO_GIT_BRANCH
ARG OMNIO_BUILD_DATE
ARG OMNIO_BUILD_NUMBER
ENV OMNIO_VERSION=${OMNIO_VERSION} \
    OMNIO_GIT_COMMIT=${OMNIO_GIT_COMMIT} \
    OMNIO_GIT_BRANCH=${OMNIO_GIT_BRANCH} \
    OMNIO_BUILD_DATE=${OMNIO_BUILD_DATE} \
    OMNIO_BUILD_NUMBER=${OMNIO_BUILD_NUMBER}
# Fail now, not after a ten-minute build, if the metadata is absent.
RUN sh docker/images/require-build-metadata.sh
# `modgen`'s bin isn't symlinked by `pnpm install` until tooling/modgen/dist
# exists (pnpm skips bin-linking for build-artifact bins that aren't built
# yet) — build it first, relink, then build everything else.
RUN pnpm turbo build --filter=@omnio/modgen... \
  && pnpm install --frozen-lockfile --prefer-offline \
  && pnpm turbo build
# Regenerate the canonical release manifest from the build args (`.git` is not in
# the context) so the image carries an authoritative release.json for /api/version.
RUN node tooling/release/gen-manifest.mjs

# ---- minimal production dependency graph for just @omnio/api ----
FROM base AS pruner
COPY . .
RUN turbo prune @omnio/api --docker

FROM base AS prod-deps
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate \
  && pnpm install --frozen-lockfile --prod

# ---- assemble runtime image ----
FROM base AS runner
RUN addgroup -S omnio && adduser -S omnio -G omnio
COPY --from=pruner /app/out/full/ .
COPY --from=prod-deps /app/ .
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages ./packages
# The canonical release manifest, generated during the build above. Read at
# runtime and merged with live fields for GET /api/version.
COPY --from=build /app/release.json ./release.json
RUN chown -R omnio:omnio /app
USER omnio
ENV NODE_ENV=production
# Build & release metadata — supplied by the release tooling, never hand-edited
# (docs/architecture/09-releases.md). Baked as ENV so `GET /api/version` reports
# the exact build without reading the (excluded) .git tree at runtime.
ARG OMNIO_VERSION
ARG OMNIO_GIT_COMMIT
ARG OMNIO_GIT_BRANCH
ARG OMNIO_BUILD_DATE
ARG OMNIO_BUILD_NUMBER
ENV OMNIO_VERSION=${OMNIO_VERSION}
ENV OMNIO_GIT_COMMIT=${OMNIO_GIT_COMMIT}
ENV OMNIO_GIT_BRANCH=${OMNIO_GIT_BRANCH}
ENV OMNIO_BUILD_DATE=${OMNIO_BUILD_DATE}
ENV OMNIO_BUILD_NUMBER=${OMNIO_BUILD_NUMBER}
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
