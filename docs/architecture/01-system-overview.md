# System Overview

**Status:** Approved 2026-07-11 (M0 complete)

Omnio is a modular, self-hosted workspace. The system is four services plus two data stores, deployed with Docker Compose. Everything else — every tool, viewer, and capability — is a _module_ built on this substrate.

## 1. Topology

```
                        ┌─────────────────────────────┐
                        │  Browser (PWA-capable SPA)  │
                        │  • App shell, command palette│
                        │  • browser-tier tools (WASM/JS)
                        └──────────┬──────────────────┘
                                   │ HTTPS
                        ┌──────────▼──────────┐
                        │   web (Next.js)     │  SSR shell, static assets,
                        │                     │  no file processing
                        └──────────┬──────────┘
                                   │ ts-rest (typed HTTP)
                        ┌──────────▼──────────┐
                        │   api (NestJS)      │  auth, uploads, jobs API,
                        │                     │  server-tier tools, admin
                        └───┬──────────┬──────┘
                            │          │ enqueue (BullMQ)
                   Prisma   │          │
              ┌─────────────▼─┐   ┌────▼─────────┐      ┌───────────────────┐
              │  PostgreSQL   │   │    Redis     │◄─────┤  worker (BullMQ)  │
              │  users, files │   │ queues, rate │      │  ffmpeg, qpdf,    │
              │  jobs, audit  │   │ limits, cache│      │  tesseract, lo,   │
              └───────────────┘   └──────────────┘      │  imagemagick…     │
                                                        │  SANDBOXED        │
                            ┌───────────────┐           └────────┬──────────┘
                            │ storage volume│◄──────────────────┘
                            │ (driver: fs → │   reads inputs, writes outputs
                            │  s3/minio)    │
                            └───────────────┘
```

Five runtime components:

| Component  | Image               | Responsibility                                                                                         |
| ---------- | ------------------- | ------------------------------------------------------------------------------------------------------ |
| `web`      | node (distroless)   | Next.js app shell. Serves UI, never touches user files.                                                |
| `api`      | node (distroless)   | NestJS. Auth, upload/download streaming, job orchestration, server-tier tools, admin, audit.           |
| `worker`   | node + native tools | BullMQ consumers. The only place native binaries run. Hardened (see [06-security.md](06-security.md)). |
| `postgres` | postgres:17         | Durable state.                                                                                         |
| `redis`    | redis:7             | Queues, rate limiting, ephemeral cache.                                                                |

All services have health checks (`/healthz` liveness, `/readyz` readiness including dependency pings). Compose ships with persistent named volumes for postgres, redis (AOF), and storage.

## 2. The three-tier execution model

Every tool declares its tier in its module manifest. This is the load-bearing decision of the whole platform (rationale in [00-vision-review.md](00-vision-review.md) §1.2).

**`browser`** — the default tier. The tool is client code; files are handled via the File API and never uploaded. Used for all pure-computation tools and, where feasible via WASM, even media work (e.g. image resize via canvas/WASM codecs). The UI badges these tools "runs on your device" — this is a product feature, not an implementation detail.

**`server`** — synchronous API call, budget <2s and <20MB. For tools that need Node-side libraries or must not ship to the client. Rate-limited per user.

**`worker`** — asynchronous job. The client uploads to a scratch workspace, the API enqueues, the worker processes in a sandbox, the client observes progress over SSE and downloads the result. All native-binary work lives here, without exception — the API container has no ffmpeg, no ghostscript, nothing to exploit.

Escalation rule: a tool may only use the lowest tier that can do the job. A PR moving a tool up-tier needs a stated reason in the manifest (`tierReason`).

## 3. Job pipeline (worker tier)

```
upload → validate (magic bytes, size, extension↔MIME) → persist to scratch
      → enqueue {jobId, moduleId, toolId, inputRefs, options}
      → worker: claim → re-validate → sandbox-execute → write outputs → report
      → client: SSE progress → download → TTL sweeper cleans scratch
```

- Jobs are rows in Postgres (status, timings, error, audit linkage); Redis/BullMQ is the transport, never the source of truth.
- Every job has hard limits: wall-clock timeout, CPU/memory caps, max output size. Exceeding any kills the job with a user-legible error.
- Progress streams over **SSE** (not WebSockets): simpler, proxy-friendly, auto-reconnecting — the traffic is strictly server→client.
- Sweeper job deletes expired scratch workspaces (default TTL 24h) and orphaned outputs.

## 4. Storage

A single `StorageDriver` interface (`put/get/stream/delete/stat/list`, streaming-first) with two areas:

- **scratch** — uploads and job outputs, TTL-swept, quota-capped.
- **workspace** — files the user explicitly kept. Quota-capped per user.

Driver #1 is local filesystem (volume-mounted). S3/MinIO is driver #2 (post-v1) — an implementation of the same interface, not a refactor. No module ever touches paths directly; everything goes through the driver.

## 5. Data model (core tables)

Modules own their own tables (prefixed `mod_<id>_…`); the core owns:

- `User` — even in single-admin mode there is exactly one real row; every user-owned table FKs to it so multi-user is a feature flag, not a migration apocalypse.
- `Session` — server-side sessions (httpOnly cookie).
- `FileObject` — metadata for every stored object (area, driver key, MIME, size, hash, ttlAt, ownerId).
- `Job` — worker-tier executions (module, tool, status, timings, error, inputs/outputs as FileObject refs).
- `ToolEvent` — anonymous usage counters for self-hosted analytics (toolId, tier, duration bucket, success — **no** file names, sizes, or content; opt-in).
- `AuditLog` — security-relevant actions (logins, admin changes, destructive ops).
- `Setting` — instance + per-user settings (theme, locale, retention overrides).

## 6. API surface

Contract-first: every endpoint is defined in `packages/contracts` as a ts-rest router with Zod schemas. NestJS implements the contract; the web app consumes the generated client through TanStack Query. One source of truth, end-to-end static types, and the same Zod schemas validate at runtime on both sides.

Public surface (v1): `auth`, `files` (upload/download/list/keep/delete), `jobs` (create/status/SSE/result), `tools` (registry, per-file-type actions), `settings`, `admin` (health, queues, storage, audit, module status), `analytics` (opt-in event sink).

## 7. Cross-cutting concerns

- **Observability:** pino structured logs everywhere (request IDs propagated web→api→worker), Prometheus-format `/metrics` on api and worker, OpenTelemetry hooks ready but not required.
- **Migrations:** Prisma migrations run on api boot behind a Postgres advisory lock (safe with multiple replicas).
- **Config:** environment variables only, validated with Zod at boot — the process refuses to start on invalid config, printing exactly what's wrong. A documented `.env.example` is part of the repo.
- **i18n:** all user-facing strings — including every module's — flow through the i18n layer from day one. English and Hebrew are both first-class; see [04-frontend.md](04-frontend.md) §5 for the RTL architecture.
- **Analytics:** self-hosted sink in the api, opt-in at onboarding, payload documented in ADMIN docs, viewable in the admin UI. No third-party calls of any kind — the app must run fully air-gapped.
