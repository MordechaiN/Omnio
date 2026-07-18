# Changelog

All notable changes to Omnio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Pre-release stages progress `alpha → beta → rc → stable`; see
[docs/architecture/09-releases.md](docs/architecture/09-releases.md).

## [Unreleased]

## [0.1.0-alpha.1] - 2026-07-18

First public alpha. Omnio becomes a professionally versioned, releasable product:
a self-hosted personal workspace with 36 on-device browser tools, an end-to-end
worker pipeline, and a permanent release-management system.

### Added

- **Semantic versioning & release infrastructure** — canonical version, embedded
  build metadata (version, commit, branch, build date, build number), a
  `GET /api/version` endpoint, an in-app About page and Changelog, a footer
  version badge, this changelog, and a documented Commit → Push → Build → Deploy
  → Verify → Tag release workflow.
- **Browser-tier tools (M7)** — 36 tools across 31 modules, all running entirely
  on your device, in English and Hebrew with full RTL: JSON/YAML/CSV converters,
  JWT decode, Base64/URL/HTML/binary encoders, number-base, UUID, hash and
  password generators, case convert, Lorem Ipsum, text stats/diff, slugify, regex
  tester, Markdown preview, line tools, unit/color/timestamp/date/Roman
  converters, WCAG contrast checker, CSS gradient builder, BMI, random numbers,
  loan/VAT/percentage/tip calculators, and a CIDR/subnet calculator.
- **End-to-end journey (M6)** — first-run setup → login → workspace → file drop
  → upload → job enqueue → live SSE progress → downloadable result → history.
- **Client workspace (M5)** — tool launcher, favorites and recent tools, global
  file drop, universal on-device viewer foundation, "/" quick-open, command
  palette, responsive + RTL shell.
- **Module system (M4)** — `modgen` auto-discovers modules and generates the
  search index, category pages, palette entries, and app dependency wiring.
- **Platform foundations (M1–M3)** — pnpm + Turborepo monorepo, Next.js web,
  NestJS api, BullMQ worker, PostgreSQL + Redis, Prisma, the design system, and
  the ts-rest typed contract.

### Changed

- **Deployment mode defaults to `personal`** — no authentication, no login, no
  setup wizard; immediate use as a self-hosted personal workspace. Set
  `OMNIO_MODE=multi-user` for the single-admin auth model with sessions.
- **Cloudflare Tunnel is the only ingress** — Internet → Tunnel →
  `127.0.0.1:4200` (web). The api and worker are internal Docker services, never
  publicly exposed; Omnio no longer uses the shared Caddy for its own routing.

### Fixed

- Lost upload bytes from a stream-teeing race between hashing and storage.
- Web now proxies `/api/*` to the internal api service so same-origin browser
  calls work without a separate reverse proxy.

### Security

- Secrets live only in `~/.env.d/*.env`; none are committed.
- Personal mode intentionally disables authentication — this deployment is
  publicly reachable with no auth by explicit operator decision.
- Browser tools are hardened: the Markdown renderer escapes HTML before
  transforming and allow-lists link protocols; hashing/password use SubtleCrypto
  and bias-free crypto RNG; JWT decoding never claims to verify signatures.

### Known limitations

- Alpha: interfaces and data shapes may change between pre-releases.
- Personal mode has no authentication by design — do not expose an instance
  holding data you are unwilling to make public.
- Worker-tier tools (image/PDF/media processing) are not part of this release.
- No automated database backups are configured yet.

[Unreleased]: https://github.com/MordechaiN/Omnio/compare/v0.1.0-alpha.1...HEAD
[0.1.0-alpha.1]: https://github.com/MordechaiN/Omnio/releases/tag/v0.1.0-alpha.1
