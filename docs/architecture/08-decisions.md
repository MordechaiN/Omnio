# Decision Log

**Status:** Approved 2026-07-11 — the founder signed off on the architecture package and resolved D1–D3 per the recommendations below. D4–D6 ship as recommended (no override raised). D7 remains an open founder action item.

Format: each decision has a recommendation and its reasoning. Overrides are welcome at any time — that's what this document is for.

---

## Resolved by founder (2026-07-11)

### D1 · License — **DECIDED: AGPL-3.0 + MIT SDK**

**Recommendation: AGPL-3.0 for the platform; MIT for `@omnio/module-sdk` and `@omnio/contracts`.**
AGPL is the proven defense for self-hosted products (Immich, Nextcloud, Grafana lineage): anyone may self-host, fork, and modify, but a cloud vendor reselling Omnio must publish their changes. MIT on the SDK/contracts means plugin and integration authors are never license-encumbered — their code is theirs. Alternative: MIT everywhere maximizes adoption but invites closed-source SaaS clones of the whole product; Apache-2.0 adds a patent grant but same clone exposure.

### D2 · Authentication default for v1 — **REVERSED 2026-07-18: personal mode (no auth), on by default**

**Superseded.** Original decision below is preserved for history; the founder reversed it directly: Omnio is primarily a self-hosted *personal* workspace, and the default deployment must require no account, no login, and no setup wizard — open it and start using it. `OMNIO_MODE=personal` (default) is now the unauthenticated single-implicit-user posture; `OMNIO_MODE=multi-user` is the original single-admin-account-with-password model, opt-in for shared/multi-user installations. Both share one codebase (`apps/api/src/auth/`); personal mode still warns loudly on boot that the instance has no auth, but no longer refuses to boot on a non-local bind by default (the product's own Docker deployment always binds `0.0.0.0` internally, so that refusal blocked the default install path — see `OMNIO_AUTH_ALLOW_INSECURE`, now defaulted `true` at the deployment layer, `false` at the library layer).

~~**Recommendation: single-admin account, enabled by default; password set during a first-run setup screen; `OMNIO_AUTH=none` escape hatch for trusted LANs (with loud warnings, refusing non-local binds unless force-flagged).**
Full rationale in [00-vision-review.md](00-vision-review.md) §1.1 and [06-security.md](06-security.md) §4. Alternative — auth off by default — is friendlier for first contact but indefensible the first time an instance on a VPS gets scraped.~~

### D3 · File retention default — **DECIDED: ephemeral 24h + explicit keep**

**Recommendation: ephemeral by default — scratch files expire after 24h (configurable); users explicitly "keep" files into a quota'd workspace.**
Aligns storage behavior with the privacy promise and prevents unbounded disk growth. Alternative — persist everything — feels convenient but turns every instance into an accidental archive and every disk into a time bomb.

### D4 · API contract mechanism — **shipping as recommended: ts-rest + Zod**

**Recommendation: ts-rest with Zod schemas in `packages/contracts`.**
End-to-end static types across web↔api with runtime validation from one definition, no codegen step, no OpenAPI YAML drift. An OpenAPI document can still be _generated from_ the contract for external consumers. Alternative — NestJS OpenAPI decorators + client codegen (orval) — is more conventional but splits truth between decorators and generated artifacts and adds a codegen loop to every API change.

### D5 · Analytics posture — **shipping as recommended: opt-in, self-hosted only**

**Recommendation: opt-in (off by default), asked once at first run, payload documented and viewable in the admin UI; strictly self-hosted sink; no third-party endpoints ever.**
"Privacy-first" with opt-out telemetry is a contradiction the community will find in the first week. The cost — less data — is real and worth it.

### D6 · Deployment shape for v1 — **shipping as recommended: Docker Compose stack**

**Recommendation: Docker Compose stack (web, api, worker, postgres, redis) as the only supported v1 deployment; an all-in-one single-container image is a post-v1 convenience; Kubernetes manifests are community-territory until demand is proven.**
Compose matches the self-hosting audience (same crowd running Immich/Paperless). The worker sandbox ([06-security.md](06-security.md) §2) _requires_ container isolation — a bare-metal "just run node" mode would silently drop the security model, so it is deliberately unsupported.

## Still open

### D7 · Name check — **OPEN: founder action before public release**

"Omnio" has existing commercial software uses. Before first public release, do a trademark/collision search and secure the namespaces (GitHub org, npm scope, domain). No architectural impact — flagging because renames after launch are brutal. **Founder action, not a code task.**

---

## Settled — justified elsewhere in this package

| Decision                                                                                                             | Where                                                                  |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Keep Next.js/React/TS/Tailwind/shadcn/Framer Motion/TanStack Query/RHF/Zod; keep NestJS/Prisma/Postgres/Redis/BullMQ | [00-vision-review.md](00-vision-review.md) §2                          |
| Three-tier tool execution (browser default / server / worker), `tierReason` required to escalate                     | [01-system-overview.md](01-system-overview.md) §2                      |
| Build-time module discovery via `modgen` codegen; no runtime scanning                                                | [03-module-system.md](03-module-system.md) §2                          |
| Third-party plugins out-of-process only, post-v1; SDK + manifest designed now                                        | [03-module-system.md](03-module-system.md) §6                          |
| pnpm + Turborepo; Node 22 LTS; strict TS; import-boundary enforcement                                                | [02-monorepo.md](02-monorepo.md)                                       |
| Storage driver abstraction day one; fs first, S3/MinIO later                                                         | [01-system-overview.md](01-system-overview.md) §4                      |
| SSE (not WebSockets) for job progress                                                                                | [01-system-overview.md](01-system-overview.md) §3                      |
| next-intl; logical CSS properties only (lint-enforced); en/he parity in CI                                           | [04-frontend.md](04-frontend.md) §5                                    |
| Inter + Noto Sans Hebrew + JetBrains Mono, self-hosted; OKLCH token palette; 4 themes                                | [05-design-system.md](05-design-system.md)                             |
| v1 search is client-side fuzzy over the tool registry; no search server                                              | [00-vision-review.md](00-vision-review.md) §1.8                        |
| Worker sandbox: no-network, non-root, read-only rootfs, per-job limits, `ctx.exec()` as sole subprocess path         | [06-security.md](06-security.md) §2                                    |
| Office docs: view-via-conversion only in v1; editing out of scope                                                    | [07-roadmap.md](07-roadmap.md)                                         |
| Single-version platform releases via Changesets; images on GHCR                                                      | [02-monorepo.md](02-monorepo.md) §4, [07-roadmap.md](07-roadmap.md) M9 |
