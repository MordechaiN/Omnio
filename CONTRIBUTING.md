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
docker compose -f docker/compose.dev.yaml up -d   # postgres :7432 · redis :7479
pnpm dev                                          # web :7400 · api :7410 · worker :7420
```

Those four lines are the whole setup — there is no `.env` to copy first. The api
and worker default to the dev stores above, and refuse those same defaults in
production so the convenience can never become a misconfiguration. Copy
`.env.example` only when you want to change something.

Omnio owns ports **7400–7449** and uses nothing outside them, so it never takes
3000, 5432 or 6379 from another project on your machine. `scripts/check-ports.sh`
tells you if something else already holds one. See [docs/ports.md](docs/ports.md).

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

Omnio is Apache-2.0 throughout. By contributing you agree your contribution is licensed under Apache-2.0. See [docs/architecture/08-decisions.md](docs/architecture/08-decisions.md), decision D1.

## Code of conduct

Everyone interacting in this project is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
