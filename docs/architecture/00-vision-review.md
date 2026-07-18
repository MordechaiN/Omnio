# Vision Review

**Status:** Approved 2026-07-11 (M0 complete)
**Scope:** Critical review of the Omnio master vision — strengths, weaknesses, risks, and the amendments the rest of this architecture package is built on.

The vision is strong: a self-hosted, privacy-first, file-first workspace is a real gap in the market. TinyWow-class tools are SaaS-only and privacy-hostile; CyberChef is powerful but single-purpose and dated; Stirling-PDF and IT-Tools each own a slice. Nobody owns the whole surface with a modular platform underneath. The "drop a file, see every action" workflow is genuinely differentiating and worth treating as the product's identity.

That said, the vision as written has gaps that would become expensive later. This document is honest about them, as instructed.

---

## 1. Weaknesses and missing requirements

### 1.1 Authentication is entirely absent — the biggest gap

The vision specifies favorites, recents, history, settings, admin, and audit logs — all per-user state — but never mentions users, sessions, or login. A self-hosted app exposed beyond localhost without an auth story is a security incident waiting to happen (see the history of unauthenticated self-hosted dashboards being scanned and exploited).

**Amendment (reversed 2026-07-18):** v1 ships in personal mode by default — no accounts, no login, immediate use — with `OMNIO_MODE=multi-user` as an opt-in single-admin-account (password set on first run) posture for shared installations. The data model is multi-user-ready from day one (every user-owned row has a `userId`, filled by a singleton implicit user in personal mode), so multi-user + OIDC/SSO can land later without migrations that rewrite the world. See decision **D2** in [08-decisions.md](08-decisions.md).

### 1.2 "Everything runs on the server" is the wrong default

The stack as written routes tools through NestJS + workers. But most of the first 50 tools (JSON formatter, Base64, UUID, hashes, regex, calculators, color tools…) need no server at all. Running them in the browser is strictly better: zero latency, zero server load, works offline, and — critically for the brand — _the file never leaves the user's machine_. "Privacy-first" is most credible when the network tab is empty.

**Amendment:** a three-tier execution model, declared per tool in its manifest:

| Tier      | Where            | For                                    | Examples                                           |
| --------- | ---------------- | -------------------------------------- | -------------------------------------------------- |
| `browser` | Client only      | Pure computation, small files          | JSON tools, encoders, calculators, color tools, QR |
| `server`  | API, synchronous | Fast (<2s), needs Node libs or secrets | Some conversions, URL metadata                     |
| `worker`  | BullMQ queue     | Heavy, long-running, native binaries   | FFmpeg, LibreOffice, OCR, PDF processing           |

Browser-tier is the default; escalation to server/worker must be justified in the module manifest. This is the single most important amendment in this review.

### 1.3 Runtime auto-discovery conflicts with the stack

"Modules must be auto-discovered, no manual registration" is the right DX goal, but _runtime_ filesystem scanning fights Next.js: static analysis, code splitting, and tree shaking all require imports to be known at build time. Runtime discovery would force dynamic `require()`s, break bundling, and destroy type safety.

**Amendment:** build-time discovery. A codegen step (`tooling/modgen`) scans `packages/modules/*/module.json` and emits typed registries (lazy route map for web, dynamic module list for API, processor map for worker). Contributors still just create a folder — no manual registration — but the output is statically analyzable. Runtime loading is reserved for the future _out-of-process_ third-party plugin system (see 03-module-system.md), which is also the only safe way to run untrusted code.

### 1.4 The plugin system is a security problem disguised as a feature

Letting external contributors ship modules "without modifying the core" implies executing third-party code. In-process plugin execution (npm-package-style) in a self-hosted app that handles users' private files is a supply-chain disaster waiting to happen.

**Amendment:** two-lane plugin strategy. First-party modules are in-repo, reviewed, and compiled in (fast lane). Third-party plugins (post-v1) run **out of process** — separate containers speaking a versioned plugin protocol, with manifest-declared permissions and no default network/filesystem access. The SDK is designed now; the untrusted-execution lane ships only when the sandbox is real. Do not promise arbitrary runtime plugins in v1.

### 1.5 File lifecycle and retention are unspecified

"Recent files" implies persistence; "privacy-first" implies ephemerality. Unbounded uploads on a self-hosted box also means unbounded disk growth — the #1 operational complaint against this class of software.

**Amendment:** ephemeral by default. Uploads land in a temp workspace with a TTL (default 24h, configurable), swept by a worker job. Users can explicitly _keep_ a file, moving it to persistent storage with quotas. Every processing job cleans its scratch directory on completion or failure. See **D3**.

### 1.6 Native binaries are the real attack surface

FFmpeg, ImageMagick, Ghostscript, and LibreOffice have long CVE histories, and Omnio's entire job is feeding them untrusted files. "Sandbox processing" needs to be a design, not a bullet point.

**Amendment:** workers run in dedicated containers: non-root, read-only rootfs, no network, tmpfs scratch, CPU/memory/time limits per job, hardened tool configs (ImageMagick `policy.xml`, Ghostscript `-dSAFER`, FFmpeg protocol whitelist), magic-byte validation before any binary touches a file. Full threat model in [06-security.md](06-security.md).

### 1.7 Scope risk: "thousands of tools" vs. shipping anything

The vision correctly says "≈50 polished tools before expanding," but the surrounding ambition (PSD, DWG, STL, office editing, AI everything) will exert constant pressure. Office-document _editing_ in particular is a multi-year project on its own.

**Amendment:** hard scope gates in the roadmap. v1: view office docs via LibreOffice→PDF conversion; no office editing. PSD/RAW/CAD/3D/e-book viewing is explicitly post-v1. Every format promise is either in a milestone with exit criteria or on the "later" list — nothing in between. See [07-roadmap.md](07-roadmap.md).

### 1.8 Smaller gaps, also amended

- **License is unchosen** — this is a founder decision that shapes the community. Recommendation: AGPL-3.0 core + MIT SDK/contracts (**D1**).
- **Analytics must be opt-in**, not opt-out, or "privacy-first" is marketing. Off by default, prompt once, fully documented payload.
- **Update/migration strategy:** Prisma migrations run on API boot with a startup lock; images are semver-tagged; `latest` is discouraged in docs.
- **Backup/restore:** documented from day one (one Postgres dump + one volume). A platform holding user files without a backup story is not enterprise-grade.
- **"PDF unlock (where legal)"** — implemented as: removing restrictions requires the user to supply the password or affirm ownership; no password-cracking features, ever.
- **Trademark:** "Omnio" collides with several existing software products. Worth a search before the first public release (founder task, noted in **D7**).
- **Search scope creep:** v1 search covers tools/commands/recents/favorites (client-side fuzzy index — instant, offline, zero infra). File _content_ search is post-v1; do not add a search server to the stack for v1.

## 2. Technology stack verdict

The proposed stack is approved with amendments. Justifications for every change in [08-decisions.md](08-decisions.md); the headlines:

| Area                                                                                     | Verdict                                                                                                                                       |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js + React + TS + Tailwind + shadcn/ui + Framer Motion + TanStack Query + RHF + Zod | **Keep.** Right choices, mainstream, contributor-friendly.                                                                                    |
| NestJS                                                                                   | **Keep.** Its module system maps 1:1 onto Omnio's module architecture; the alternative (bare Fastify + hand-rolled DI) rebuilds NestJS badly. |
| Prisma + PostgreSQL + Redis + BullMQ                                                     | **Keep.** Boring and correct.                                                                                                                 |
| **Add:** pnpm + Turborepo                                                                | Monorepo backbone: workspaces, task graph, remote-cache-ready.                                                                                |
| **Add:** shared `contracts` package (Zod + ts-rest)                                      | One source of truth for API types end to end; eliminates frontend/backend drift.                                                              |
| **Add:** three-tier tool execution                                                       | See 1.2 — the defining amendment.                                                                                                             |
| **Add:** storage driver abstraction from day one                                         | Local FS driver first; S3/MinIO is a driver, not a rewrite.                                                                                   |
| **Change:** module discovery is build-time codegen                                       | See 1.3.                                                                                                                                      |
| **Defer:** search server, office editing, in-process plugins                             | See scope gates.                                                                                                                              |

## 3. Future risks to keep on the radar

1. **Maintainer bus factor** — the module SDK and contribution docs are the mitigation; optimize for a contributor shipping a browser-tier tool in under an hour.
2. **Docker image size creep** — LibreOffice + FFmpeg + Tesseract easily exceeds 2GB. Mitigation: profile-based compose (core vs. full), per-capability worker images post-v1.
3. **Format promise inflation** — every "can it open X?" issue will pressure scope. The capability registry makes "what's supported" machine-readable and honest.
4. **RTL regression risk** — mitigated by banning physical CSS properties (lint-enforced) and running visual tests in both directions from the first component.
5. **The 1000-tool consistency problem** — solved architecturally by the `ToolShell` contract (every tool renders inside one standard surface), not by review vigilance. See [04-frontend.md](04-frontend.md).
