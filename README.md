# Omnio

**Everything. One Workspace.**

A completely self-hosted, privacy-first workspace for opening, viewing, editing, converting, analyzing, and managing virtually every common file format — and the everyday digital tasks around them — from one beautiful interface.

> **Status:** milestone **M1** (repository & toolchain) of the [roadmap](docs/architecture/07-roadmap.md). The platform skeleton builds, tests, and boots; the product arrives milestone by milestone, with the repo releasable at every commit.

## Why Omnio

Most "free online tools" sites are privacy funnels: your files are the payment. Omnio flips that — every tool that _can_ run in your browser does (your file never leaves your device), everything else runs on your own hardware, and the whole platform is open source. See the [three-tier execution model](docs/architecture/01-system-overview.md#2-the-three-tier-execution-model).

## Repository layout

```
apps/         web (Next.js) · api (NestJS) · worker (BullMQ)
packages/     contracts · core · config · (ui, module-sdk, i18n → M2/M4)
packages/modules/   every tool and viewer lives here (from M4)
tooling/      build-time module discovery (M4)
docker/       compose stacks
docs/         architecture & guides
```

## Development

```bash
# prerequisites: Node 22+, pnpm 10+, Docker
pnpm install
docker compose -f docker/compose.dev.yaml up -d   # postgres + redis
pnpm dev                                          # web :3000 · api :4000 · worker :4100
```

`pnpm build · lint · typecheck · test` — the same tasks CI runs.

## Documentation

The complete architectural design lives in [`docs/architecture/`](docs/architecture/README.md): the vision review, system design, module/plugin system, frontend and design system, the security model for processing untrusted files, and the roadmap with the decision log.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Tool contributions become a one-hour job once the module SDK lands (M4) — watch the roadmap.

## License

[AGPL-3.0-only](LICENSE) for the platform; [`packages/contracts`](packages/contracts/LICENSE) (and the future module SDK) are MIT so integrators and plugin authors are never license-encumbered. Rationale: [decision D1](docs/architecture/08-decisions.md).
