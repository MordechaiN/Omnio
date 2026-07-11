# Implementation Roadmap

**Status:** Approved 2026-07-11 (M0 complete)

Milestones, not dates — each has exit criteria, and a milestone isn't done until they all pass. The repo must build, lint, test, and boot green at the end of **every** milestone (and every commit within one).

## M0 — Architecture approval ✅ _(2026-07-11)_

This document set reviewed; decisions D1–D7 ([08-decisions.md](08-decisions.md)) resolved by the founder.

## M1 — Repository & toolchain ← _in progress_

Monorepo scaffold per [02-monorepo.md](02-monorepo.md): pnpm + Turborepo; `web`/`api`/`worker` hello-world apps; `contracts`, `core`, `config` packages; ESLint (incl. logical-properties rule, import-boundary rules), Prettier, tsconfig strict; Vitest + Playwright wiring; CI pipeline; compose dev stack (postgres, redis) with health checks; `.env.example`; community files (README, LICENSE, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, issue/PR templates).
**Exit:** clone → `pnpm i && pnpm dev` → shell page served by web, `/healthz` green on api+worker, CI green.

## M2 — Design system core

`@omnio/ui`: tokens (light/dark/high-contrast, OKLCH palette with AA-verified pairs), fonts self-hosted, primitives restyled over shadcn/Radix, Storybook with theme × direction matrix, visual-regression baseline.
**Exit:** Storybook builds in CI; token contrast test passes; primitives render correctly in all 4 theme/direction combos.

## M3 — Core platform services

Auth (single-admin, sessions, first-run setup flow), config validation, storage driver (fs) + scratch/workspace areas + TTL sweeper, upload/download streaming with validation pipeline, `Job` model + BullMQ round-trip + SSE progress, rate limiting, security headers/CSP, audit log, pino logging with request IDs, Prisma migrations on boot.
**Exit:** integration tests (Testcontainers) cover auth, upload→job→download→sweep lifecycle; security headers verified by test.

## M4 — Module system

`@omnio/module-sdk` (manifest schema, tool contracts, `ctx.exec()`); `tooling/modgen` emitting all four registries + `capabilities.json`; `pnpm new:module` / `new:tool` scaffolders; i18n pipeline (next-intl, per-module catalogs, en/he parity check); one reference module per tier (browser: uuid; server: placeholder; worker: a trivial file transform) proving the whole path.
**Exit:** a scaffolded browser tool appears in the app with zero manual registration; manifest violations fail the build with actionable errors.

## M5 — App shell & navigation

Shell layout (sidebar, top bar, jobs tray), command palette with client-side fuzzy search, category pages, home page, global dropzone + paste, file-action sheet driven by `capabilities.json`, settings (theme, language, analytics opt-in), keyboard map, mobile layouts, RTL end-to-end.
**Exit:** Playwright e2e — search→open tool, drop file→action sheet→tool, keyboard-only navigation pass; axe checks pass; RTL visual smoke green.

## M6 — Universal file viewer (flagship #1)

`viewer` module: images (incl. zoom/pan), video/audio (native + range streaming), PDF (pdf.js), text/code (CodeMirror read mode, syntax highlighting), Markdown (sanitized), JSON/YAML/XML/CSV (tree/table views), fonts (specimen), archives (listing + safe extract), HTML/SVG (sandboxed iframe). Office docs via worker conversion→PDF preview (LibreOffice).
**Exit:** drop any supported file → correct viewer < 1s for local rendering; unsupported files get a graceful "here's what you can do instead" state.

## M7 — First tools: browser tier (~30 tools)

dev-tools, text, generators, calculators modules: JSON format/validate, YAML↔JSON, XML format, CSV viewer, Markdown preview, JWT decode, Base64/URL encode-decode, hash generator, UUID, password generator, Lorem Ipsum, regex tester, color picker, gradient generator, QR/barcode generator, timestamp/timezone converters, age/VAT/loan/percentage/BMI calculators, random/dice/coin, case converter, text diff.
**Exit:** every tool: ToolShell surface, en+he, keyboard accessible, unit-tested logic, "runs on your device" badge.

## M8 — First tools: worker tier (~20 tools)

image module (sharp): resize, crop, rotate, compress, convert, watermark, metadata view/strip. pdf module (qpdf/pdf-lib/ghostscript/poppler): merge, split, compress, rotate, extract text/images, watermark, PDF↔image. media module (ffmpeg): video convert/compress/trim, audio convert/extract, thumbnail, GIF. Hardened worker image per [06-security.md](06-security.md) §2.
**Exit:** each tool has golden-file tests; sandbox limits demonstrably kill oversized/overlong jobs; job UX (progress, cancel, errors) consistent across all.

## M9 — Admin & operations

Admin UI: dashboard (health, versions), queue monitor, storage usage + manual sweep, audit log viewer, module enable/disable, analytics viewer (opt-in data only), log tail. Production compose profile, image publishing (GHCR, semver + digest pins), backup/restore guide, update guide.
**Exit:** fresh-machine production deploy from docs alone in <15 minutes; backup/restore rehearsed and documented.

## M10 — v1.0 polish & docs

Performance budget pass (shell <200KB gz), error-state and empty-state sweep, copy review (en+he native quality), docs site (architecture, self-hosting, module author guide, tool catalog generated from manifests), demo instance, launch README with screenshots.
**Exit:** v1.0.0 tagged; a stranger can self-host and a contributor can ship a tool using docs alone.

---

## Post-v1 (explicitly out of v1 scope)

Multi-user + OIDC · third-party plugin lane (out-of-process) · S3/MinIO driver · OCR (tesseract) + searchable-PDF · AI module (Ollama/Whisper integrations, all optional/local) · PWA offline mode · file-content search · PSD/RAW/STL/EPUB viewers · per-capability worker images · gVisor runtime option · PDF sign/protect · office editing (may never happen; conversion-based viewing only until a credible plan exists).

## Sequencing rationale

Design system before platform (M2 < M5) so nothing is built twice; module system before any tools (M4 < M7) so no tool is ever hand-registered; browser tools before worker tools (M7 < M8) because they exercise the whole UX with zero infrastructure risk; admin before 1.0 because self-hosters without ops visibility file issues instead of fixing configs.
