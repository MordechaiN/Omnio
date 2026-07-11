# Monorepo Structure

**Status:** Phase 1 deliverable · awaiting founder approval
**Tooling:** pnpm workspaces + Turborepo · Node 22 LTS · TypeScript strict everywhere

## 1. Layout

```
omnio/
├── apps/
│   ├── web/                    # Next.js (App Router) — UI shell
│   ├── api/                    # NestJS — HTTP API
│   └── worker/                 # BullMQ consumers — heavy processing
│
├── packages/
│   ├── contracts/              # ts-rest routers + Zod schemas (API source of truth)
│   ├── module-sdk/             # module manifest schema, tool contracts, lifecycle types
│   ├── ui/                     # design system: tokens, primitives, ToolShell
│   ├── i18n/                   # message catalogs, locale utilities (en, he)
│   ├── core/                   # shared runtime utils (result types, errors, mime, bytes)
│   └── config/                 # shared eslint / tsconfig / tailwind / prettier presets
│
├── packages/modules/           # ← every feature lives here
│   ├── dev-tools/              #   json, base64, uuid, hash, jwt, regex…
│   ├── pdf/                    #   view, merge, split, compress, ocr…
│   ├── image/                  #   resize, crop, convert, compress…
│   ├── media/                  #   video/audio convert, trim, extract…
│   ├── calculators/            #   vat, loan, bmi, percentage, age…
│   ├── text/                   #   markdown, lorem, case, diff…
│   ├── generators/             #   qr, barcode, password, color…
│   └── viewer/                 #   the universal file viewer
│
├── tooling/
│   └── modgen/                 # build-time module discovery & registry codegen
│
├── docker/
│   ├── compose.yaml            # production stack
│   ├── compose.dev.yaml        # dev overrides (hot reload, exposed ports)
│   └── images/                 # Dockerfiles: web, api, worker
│
├── docs/                       # architecture, guides, ADRs
└── .github/                    # CI, issue/PR templates, security policy
```

## 2. Package boundaries (the dependency law)

```
apps/web ──────► packages/ui, contracts, i18n, core, modules/*(frontend)
apps/api ──────► packages/contracts, core, module-sdk, modules/*(server)
apps/worker ───► packages/core, module-sdk, modules/*(worker)
modules/* ─────► module-sdk, ui, core, i18n     (NEVER apps, NEVER each other)
contracts ─────► zod only
module-sdk ────► zod, core
ui ────────────► core
core ──────────► (leaf)
```

Enforced mechanically (eslint `no-restricted-imports` + dependency-cruiser in CI), not by convention. The two rules that keep the platform maintainable at 1,000 tools:

1. **Modules never import each other.** Shared logic graduates into `core`, `ui`, or `module-sdk`.
2. **Apps never contain features.** `apps/*` is wiring; features live in `packages/modules/*`. If a PR adds product logic under `apps/`, it's in the wrong place.

## 3. Module anatomy

Each module is one folder with a strict internal shape (validated by `modgen`):

```
packages/modules/pdf/
├── module.json           # manifest — see 03-module-system.md
├── frontend/             # React: tool surfaces, viewer panels (lazy-loaded)
│   └── tools/<toolId>.tsx
├── server/               # NestJS module (only if it has server-tier tools/routes)
├── worker/               # BullMQ processors (only if it has worker-tier tools)
├── shared/               # module-private shared code
├── i18n/
│   ├── en.json
│   └── he.json           # both locales required — CI fails on missing keys
└── __tests__/
```

`frontend/`, `server/`, `worker/` are each optional — a calculators module is frontend-only; every tool ships in whichever tier its manifest declares.

## 4. Build & task graph

Turborepo tasks: `build`, `dev`, `lint`, `typecheck`, `test`, `test:e2e`, with `modgen` as a dependency of `build`/`dev` (registries are generated before anything compiles). Caching keyed on inputs; CI uses the same graph — local and CI never disagree about what "green" means.

Versioning: single version for the platform (the Docker images are the release artifact), managed with Changesets for changelog generation. `module-sdk` and `contracts` get independent semver once third-party plugins exist.

## 5. CI (GitHub Actions)

Every PR: install → modgen → lint (eslint + prettier + dependency-cruiser) → typecheck → unit tests (Vitest) → build → e2e smoke (Playwright against compose stack) → i18n completeness check (en/he key parity) → RTL visual smoke (the same Playwright suite runs key screens with `dir="rtl"`).

Every commit to `main` must be releasable: images build, stack boots, health checks pass. This is the "always in a working state" requirement made mechanical.

## 6. Developer experience targets

- `pnpm i && pnpm dev` brings up the full stack (compose for postgres/redis, hot-reload for all three apps) in under two minutes on a laptop.
- `pnpm new:module` / `pnpm new:tool` scaffolders generate a manifest, a ToolShell-ready surface, i18n stubs, and a test — a contributor ships a browser-tier tool in under an hour.
- Testcontainers for integration tests — no "you must have postgres running" README rituals.
