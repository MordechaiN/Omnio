# Changelog

All notable changes to Omnio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Pre-release stages progress `alpha → beta → rc → stable`; see
[docs/architecture/09-releases.md](docs/architecture/09-releases.md).

## [Unreleased]

### Added

- **Four visual styles** — Classic (the original), **Modern** (new default: warmer neutrals, rounder corners, a bolder focus ring), Minimal (near-grayscale, tightest radii, flat shadows), and Accessible (AAA contrast and bold borders by default, 4px focus ring). Switchable and fully reversible from the theme menu, Settings → Appearance, or the command palette; persisted per device. Every style clears the same WCAG AA/AAA gate.
- **Five accent colors** — Indigo (default), Blue, Purple, Green, Orange — independent of style, so any style can wear any accent. 1,925 automated contrast assertions cover every style × accent × theme × contrast-mode combination.
- **Density control** — Compact, Comfortable (default), or Large — scales shared control heights (buttons, inputs, selects) app-wide from one Settings switch, for bigger touch targets on demand.
- **Expanded Settings** — restructured into General, Appearance (theme/style/density/accent), Accessibility (high-contrast toggle + a one-click Accessible-style shortcut), Language, and Behavior (auto-open Activity tray toggle) — each section a real, working setting, no placeholders.
- **Platform Statistics page** (`/stats`, replacing the local usage-stats page) — General facts (tool count, category count, version, build date) always shown; Usage and Popularity (most-used tools/categories, total/average executions, trending) read from the platform's opt-in, anonymous, instance-wide analytics aggregate, with an honest explanation shown instead of data when analytics is off.
- **`GET /api/v1/analytics/stats`** — read-only, unauthenticated aggregate endpoint over the existing `ToolEvent` table (decision D5); still off by default, still no per-user data.
- **Copy Debug Information** on the About page — one click copies a short technical summary (version, commit, branch, mode, environment, Node, platform, service statuses) formatted for pasting into a bug report.

### Changed

- **History removed from the UI.** The personal per-run log (`/history`: timestamps, statuses, re-downloads) is gone, along with the local per-device usage counters that briefly replaced it. Live job tracking during a run (the Activity tray, SSE progress, downloads) is unaffected — only the after-the-fact personal record was removed, in favor of anonymous platform-wide statistics.
- The About page's Project/Runtime/Services sections were reorganized and now include an overall health summary.

### Security

- Usage statistics never carry a per-user or per-run field — the `analytics.stats` response is limited to `{ toolId, count }`, and the underlying table has no user column at all, so this data cannot become personal even if multi-user mode is enabled later.

### Fixed

- Markdown preview's inline code-span placeholder used a raw NUL byte as its delimiter, tripping `no-control-regex`; switched to an explicit U+E000 (Private Use Area) escape with no behavior change (7/7 tests unaffected).
- Removed a vestigial `eslint-disable react-hooks/exhaustive-deps` comment in the password generator referencing a plugin that isn't part of the shared lint config, which failed lint outright.
- The accent-color picker in Settings now implements real WAI-ARIA `radiogroup` keyboard navigation (roving tabindex, RTL-aware arrow keys) instead of a mouse-only control with unearned ARIA roles.

## [0.1.0-alpha.1] - 2026-07-18

First public alpha. Omnio becomes a professionally versioned, releasable product:
a self-hosted personal workspace with 36 on-device browser tools, an end-to-end
worker pipeline, and a permanent release-management system.

### Added

- **Semantic versioning & release infrastructure** — canonical version, a
  generated `release.json` manifest (single source of truth) embedded in the
  image and served whole from `GET /api/version`, a `GET /api/health` service
  report, an About system-information page (General / Deployment / Runtime /
  live Services / Project), an in-app Changelog, a footer version badge, this
  changelog, and a documented Commit → Push → Build → Deploy → Verify → Tag
  workflow that prints a deployment summary proving Oracle matches GitHub.
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
