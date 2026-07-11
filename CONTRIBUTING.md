# Contributing to Omnio

Thanks for wanting to build this with us. Omnio is designed so that contributing a tool is a one-hour job, not a weekend spelunking trip — if the docs don't get you there, that's a bug in the docs and we want the issue.

## Ground rules

- Read [docs/architecture/](docs/architecture/README.md) before proposing structural changes — most "why is it like this?" questions are answered there, and PRs that fight the architecture will be redirected to a design discussion first.
- Every commit must build, lint, and test green. The repository is always releasable.
- Every user-facing string is an i18n key with **both** `en` and `he` translations. CI enforces parity.
- Physical direction CSS (`ml-*`, `left-*`, `text-left`, …) fails lint. Use logical properties (`ms-*`, `start-*`, `text-start`). RTL is not a port — it's native.
- Features live in `packages/modules/*`, never in `apps/*`. Modules never import each other.

## Getting started

```bash
# prerequisites: Node 22+, pnpm 10+, Docker
git clone https://github.com/MordechaiN/Omnio.git && cd Omnio
pnpm install
docker compose -f docker/compose.dev.yaml up -d   # postgres + redis
pnpm dev                                          # web :3000 · api :4000 · worker :4100
```

Verify your environment: `pnpm build && pnpm lint && pnpm typecheck && pnpm test`.

## Making changes

1. Branch from `main`.
2. Make the change, with tests. Tool logic gets unit tests; anything touching the upload→job→download path gets an integration test.
3. `pnpm format:fix` before committing.
4. Open a PR using the template. Small and focused beats big and heroic — a PR that adds one polished tool is perfect.

Commit messages follow the conventional style you'll see in `git log` (`feat:`, `fix:`, `docs:`, `chore:` …) with a scope when it helps (`feat(pdf): add page rotation`).

## Adding a tool (the common case)

Scaffolders (`pnpm new:module`, `pnpm new:tool`) arrive with milestone M4 and generate the manifest, surface, i18n stubs, and test. Until then, tool contributions land after M4 — watch the [roadmap](docs/architecture/07-roadmap.md).

## Licensing of contributions

The platform is AGPL-3.0-only; `packages/contracts` (and the future `module-sdk`) are MIT. By contributing you agree your contribution is licensed under the license of the package it modifies. See [docs/architecture/08-decisions.md](docs/architecture/08-decisions.md), decision D1.

## Code of conduct

Everyone interacting in this project is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
