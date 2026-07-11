# Omnio Architecture

Phase 1 deliverable: the complete architectural design for Omnio, produced before any implementation code. Read in order — later documents assume earlier ones.

| # | Document | What it covers |
|---|---|---|
| 00 | [Vision Review](00-vision-review.md) | Critical review of the master vision: weaknesses found, risks, and the amendments everything else builds on |
| 01 | [System Overview](01-system-overview.md) | Service topology, the three-tier tool execution model, job pipeline, storage, data model, API surface |
| 02 | [Monorepo](02-monorepo.md) | Repository layout, package boundaries, module anatomy, build graph, CI, developer experience |
| 03 | [Module System](03-module-system.md) | Manifests, build-time discovery, tool contracts (SDK), lifecycle, the file-action flow, third-party plugin lanes |
| 04 | [Frontend](04-frontend.md) | App shell, routing, the ToolShell contract, state, i18n/RTL, accessibility, performance |
| 05 | [Design System](05-design-system.md) | Design position, tokens, themes, typography, patterns, voice, governance |
| 06 | [Security](06-security.md) | Threat model, worker sandbox, file handling rules, web/API security, secrets, disclosure |
| 07 | [Roadmap](07-roadmap.md) | Milestones M0–M10 with exit criteria; explicit post-v1 scope |
| 08 | [Decisions](08-decisions.md) | Open decisions awaiting founder sign-off (D1–D7) and the settled decision index |

**Current status:** M0 — awaiting founder approval of this package and resolution of decisions D1–D7. Implementation (M1) begins once approved.
