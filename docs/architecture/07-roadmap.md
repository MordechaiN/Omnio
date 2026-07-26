# Implementation Roadmap

**Status:** Approved 2026-07-11. Milestones M0–M7 delivered as written; the product then diverged from this plan — see *Where the product actually is* below.

> **This is a planning record, not a description of the product.**
> For what Omnio does today, read [CHANGELOG.md](../../CHANGELOG.md) and the
> release notes in [`content/releases/`](../../content/releases/), which are
> authoritative. This file is kept for the reasoning behind the early
> milestones; where it disagrees with the shipped product, the product wins.

## Where the product actually is

Omnio ships **123 tools across 45 modules**, of which **121 run entirely in the
browser** and 2 on the worker. Development after M7 followed the product rather
than this document: instead of M8's worker-tier image/PDF/media modules, those
capabilities were built on-device, because a tool that uploads your file to a
server contradicts the reason Omnio exists. The worker tier remains for the
genuinely un-portable cases (currently Office→PDF).

Work since then — the file Workspace, Chains, Insights, Recognition,
Discoveries and Workspace Actions — is not described here at all. It was not
planned in this document and is recorded in the changelog instead.

Milestones, not dates — each has exit criteria, and a milestone isn't done until they all pass. The repo must build, lint, test, and boot green at the end of **every** milestone (and every commit within one).

## M0 — Architecture approval ✅ _(2026-07-11)_

This document set reviewed; decisions D1–D7 ([08-decisions.md](08-decisions.md)) resolved by the founder.

## M1 — Repository & toolchain ✅ _(2026-07-11)_

Monorepo scaffold per [02-monorepo.md](02-monorepo.md): pnpm + Turborepo; `web`/`api`/`worker` hello-world apps; `contracts`, `core`, `config` packages; ESLint (incl. logical-properties rule, import-boundary rules), Prettier, tsconfig strict; Vitest + Playwright wiring; CI pipeline; compose dev stack (postgres, redis) with health checks; `.env.example`; community files (README, LICENSE, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, issue/PR templates).
**Exit:** clone → `pnpm i && pnpm dev` → shell page served by web, `/healthz` green on api+worker, CI green.

## M2 — Design system & application foundation ✅ _(2026-07-12)_

`@omnio/ui`: tokens (light/dark/high-contrast, OKLCH palette with AA-verified pairs), fonts self-hosted, primitives restyled over shadcn/Radix, Storybook with theme × direction matrix, visual-regression baseline.
**Exit:** Storybook builds in CI; token contrast test passes; primitives render correctly in all 4 theme/direction combos.

_Scope note:_ at founder direction, M2 also pulled forward from M5: the app shell (sidebar/top bar/mobile sheet), the ⌘K command palette, full i18n + RTL wiring (en/he, next-intl), settings, and the redesigned home. M5 therefore shrinks to the file-first surfaces: global dropzone + file-action sheet, jobs tray, recents/pinned, and palette-over-tool-registry. Deviations from the design spec are recorded in [05-design-system.md](05-design-system.md) §6; the milestone self-review lives in [../reviews/M2.md](../reviews/M2.md).

## M3 — Core platform services ✅ _(2026-07-17)_

Auth (single-admin, sessions, first-run setup flow), config validation, storage driver (fs) + scratch/workspace areas + TTL sweeper, upload/download streaming with validation pipeline, `Job` model + BullMQ round-trip + SSE progress, rate limiting, security headers/CSP, audit log, pino logging with request IDs, Prisma migrations on boot.
**Exit:** integration tests (Testcontainers) cover auth, upload→job→download→sweep lifecycle; security headers verified by test.

Delivered as `@omnio/db`, `@omnio/storage`, `@omnio/jobs`, the api platform modules (config/infra/auth/security/files/jobs/audit/analytics), and the worker's BullMQ consumer + sweeper. Integration tests run in a dedicated CI job; the milestone self-review lives in [../reviews/M3.md](../reviews/M3.md).

## M4 — Module system ✅ _(2026-07-17)_

`@omnio/module-sdk` (manifest schema, tool contracts, `ctx.exec()`); `tooling/modgen` emitting all four registries + `capabilities.json`; `pnpm new:module` / `new:tool` scaffolders; i18n pipeline (next-intl, per-module catalogs, en/he parity check); one reference module per tier (browser: uuid; server: placeholder; worker: a trivial file transform) proving the whole path.
**Exit:** a scaffolded browser tool appears in the app with zero manual registration; manifest violations fail the build with actionable errors.

Delivered as `@omnio/module-sdk`, `@omnio/modgen`, `@omnio/scaffold`, and the `uuid` (browser) + `case` (worker) reference modules. The worker moved to a bundled NodeNext build to load module source; the server-tier reference is deferred until a real server tool lands (api registry stays empty). Milestone self-review: [../reviews/M4.md](../reviews/M4.md).

## M5 — App shell & navigation ✅ _(2026-07-17)_

Shell layout (sidebar, top bar, jobs tray), command palette with client-side fuzzy search, category pages, home page, global dropzone + paste, file-action sheet driven by `capabilities.json`, settings (theme, language, analytics opt-in), keyboard map, mobile layouts, RTL end-to-end.
**Exit:** Playwright e2e — search→open tool, drop file→action sheet→tool, keyboard-only navigation pass; axe checks pass; RTL visual smoke green.

Delivered: the client-first workspace — tool launcher, favorites + recent tools (schema-versioned localStorage), global file drop → action sheet → universal viewer foundation (images/PDF/text/audio/video, on-device), "/" quick-open, loading/empty/no-preview states, responsive + RTL, and Playwright coverage (search→open tool, favorites, palette; axe + RTL green). The API-backed workflow it left pending was delivered as M6. Self-review: [../reviews/M5.md](../reviews/M5.md).

## M6 — First end-to-end journey ✅ _(2026-07-17)_

The first complete, API-backed workflow: first-run setup → login → workspace → drop/choose a file → upload → enqueue → live SSE progress → downloadable result → history. Typed ts-rest client + TanStack Query, single-admin auth gate, the raw multipart upload path, a global Activity tray driven by the worker's Redis→SSE progress, `GET /api/v1/jobs` history, and a History page. Worker-tier file actions now run inline from the action sheet instead of deep-linking.
**Exit:** Playwright e2e — auth setup/login/offline, upload→SSE→download, populated + empty history; axe over the tray and history; en/he parity. Self-review: [../reviews/M6.md](../reviews/M6.md).

_Resequenced:_ the universal file viewer (former M6 flagship — zoom/pan, pdf.js, CodeMirror, tree/table views, sandboxed HTML/SVG, office→PDF) becomes a later flagship. The M5 viewer _foundation_ already covers on-device inline preview for the common types.

## M7 — First tools: browser tier ✅ _(2026-07-18)_

36 browser-tier tools across 31 modules, all running entirely on-device: **developer** (JSON format, YAML↔JSON, CSV↔JSON, JWT decode, Base64, URL encode, HTML entities, text↔binary, number base, UUID), **text** (case convert, Lorem Ipsum, text stats, text diff, slugify, regex tester, Markdown preview, line tools, and more), **security** (hash generator, password generator), **utilities** (unit/color/timestamp/date converters, contrast checker, CSS gradient, BMI, random numbers, Roman numerals), **finance** (loan, VAT, percentage, tip), **networking** (CIDR/subnet). Each module ships shared logic + unit tests, an accessible ToolShell surface, and en+he i18n with RTL; all auto-registered by `modgen` into search, categories, and the command palette.
**Exit:** every tool — ToolShell surface, en+he parity, keyboard accessible, unit-tested logic, "runs on your device" badge, offline where possible. Full workspace test suite + web typecheck + production build green. Self-review: [../reviews/M7.md](../reviews/M7.md).

## M8 — First tools: worker tier (~20 tools) — ⤳ _superseded_

**Not built as planned.** The capabilities landed, but on-device rather than on
the worker: image, PDF and media tools all run in the browser today. Sending a
user's file to a server to rotate a page would contradict the product's central
promise, and the browser turned out to be capable of nearly all of it. The
worker tier is reserved for what genuinely cannot run locally.

The original plan, for the record: image module (sharp): resize, crop, rotate, compress, convert, watermark, metadata view/strip. pdf module (qpdf/pdf-lib/ghostscript/poppler): merge, split, compress, rotate, extract text/images, watermark, PDF↔image. media module (ffmpeg): video convert/compress/trim, audio convert/extract, thumbnail, GIF. Hardened worker image per [06-security.md](06-security.md) §2.

## M9 — Admin & operations

Admin UI: dashboard (health, versions), queue monitor, storage usage + manual sweep, audit log viewer, module enable/disable, analytics viewer (opt-in data only), log tail. Production compose profile, image publishing (GHCR, semver + digest pins), backup/restore guide, update guide.
**Exit:** fresh-machine production deploy from docs alone in <15 minutes; backup/restore rehearsed and documented.

## M10 — v1.0 polish & docs

Performance budget pass (shell <200KB gz), error-state and empty-state sweep, copy review (en+he native quality), docs site (architecture, self-hosting, module author guide, tool catalog generated from manifests), demo instance, launch README with screenshots.
**Exit:** v1.0.0 tagged; a stranger can self-host and a contributor can ship a tool using docs alone.

---

## Post-v1 (explicitly out of v1 scope)

Multi-user + OIDC · third-party plugin lane (out-of-process) · S3/MinIO driver · AI module (Ollama/Whisper integrations, all optional/local) · PWA offline mode · file-content search · PSD/RAW/STL/EPUB viewers · per-capability worker images · gVisor runtime option · PDF signing · office editing (may never happen; conversion-based viewing only until a credible plan exists).

Two items have been struck from this list because they shipped: **OCR +
searchable PDF** (`pdf-ocr`, on-device via tesseract) and **PDF protection**
(`pdf-protect`). Listing shipped features as out of scope is worse than listing
nothing at all — a reader checking whether Omnio can OCR a scan would have
concluded that it cannot.

## Sequencing rationale

Design system before platform (M2 < M5) so nothing is built twice; module system before any tools (M4 < M7) so no tool is ever hand-registered; browser tools before worker tools (M7 < M8) because they exercise the whole UX with zero infrastructure risk; admin before 1.0 because self-hosters without ops visibility file issues instead of fixing configs.
