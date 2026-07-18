# Releases & Versioning

Omnio's permanent release-management system. It governs how versions are named,
how every build stamps itself, and the exact steps that take a change from a
commit to a verified, tagged deployment. This is not milestone-specific — it is
the workflow for the lifetime of the project.

## 1. Semantic Versioning

Omnio follows [Semantic Versioning 2.0.0](https://semver.org): `MAJOR.MINOR.PATCH`,
optionally with a pre-release suffix.

- **MAJOR** — incompatible/removed behaviour a self-hoster must react to.
- **MINOR** — new functionality, backward compatible (new tools, new pages).
- **PATCH** — backward-compatible bug/security fixes only.

### Pre-release stages

A version matures through stages before it is declared stable. Each stage is a
SemVer pre-release identifier, and identifiers sort in this order:

| Stage             | Example            | Meaning                                                        |
| ----------------- | ------------------ | -------------------------------------------------------------- |
| alpha             | `0.1.0-alpha.1`    | Feature-incomplete or unproven; interfaces and data may change |
| beta              | `0.1.0-beta.1`     | Feature-complete for the target; stabilizing; wider testing    |
| release candidate | `0.1.0-rc.1`       | Believed shippable; released as stable if no blockers surface  |
| stable            | `0.1.0`            | Supported release; the version with no pre-release suffix      |
| patch             | `0.1.1`            | Fixes on top of a stable release                               |

The numeric counter (`alpha.1 → alpha.2`) increments for each iteration within a
stage. Moving stage resets the counter (`alpha.3 → beta.1`). A pre-release
(`0.1.0-alpha.1`) always sorts **before** its stable form (`0.1.0`).

### Where the version lives

The **root `package.json` `version`** is the single canonical source of truth.
`apps/web`, `apps/api`, and `apps/worker` track it. The release tooling reads it;
nothing else hand-maintains a version string. Bumping the version is a deliberate
edit to that field, made once per release.

## 2. Build metadata

Every build embeds an immutable record of what it is. These values are **never
maintained by hand** — the release tooling computes them from git and injects
them as Docker build args (`docker/images/{web,api}.Dockerfile`), which become
image `ENV`:

| Field          | Source                                        |
| -------------- | --------------------------------------------- |
| Version        | root `package.json` `version`                 |
| Git commit     | `git rev-parse --short HEAD`                   |
| Git branch     | `git rev-parse --abbrev-ref HEAD`             |
| Build date     | build wall-clock, ISO 8601 UTC                |
| Build number   | `$BUILD_NUMBER`, else `git rev-list --count HEAD` |
| Deployment mode | `OMNIO_MODE` (runtime — read per request)     |
| Environment    | `OMNIO_ENVIRONMENT` / `NODE_ENV` (runtime)    |

`tooling/release/build-metadata.mjs` is the one computation. `.git` is excluded
from the Docker build context, so git-derived values must arrive as build args —
they cannot be read inside the image.

The **web** tier receives them as `NEXT_PUBLIC_OMNIO_*` (inlined into the client
bundle at build). The **api** tier receives them as `OMNIO_*` env (read at
runtime). The immutable fields describe the build; mode and environment describe
the running deployment and are read live, so they are always current.

## 3. Surfaces

- **`GET /api/version`** — the running api's own report `{ version, commit,
  branch, buildDate, buildNumber, environment, mode }`. Unauthenticated
  deployment metadata (like `/healthz`). The canonical "what is running" source.
- **Footer** — `Omnio · vX.Y.Z-stage.N · Commit <sha>` on every page; the
  version links to About.
- **About page** (`/about`) — full build + deployment report, plus license,
  repository, documentation, release notes, and a live build-status check that
  confirms the running api's commit matches the bundle it shipped with.
- **Changelog page** (`/changelog`) — renders `CHANGELOG.md`, grouped New /
  Changed / Fixed / Security per release.

## 4. Changelog & release notes

`CHANGELOG.md` at the repository root is canonical, in
[Keep a Changelog](https://keepachangelog.com) format. Each release lists
`Added` (shown as **New**), `Changed`, `Fixed`, `Security`, and where relevant
`Known limitations`. An `[Unreleased]` section accrues entries between releases;
cutting a release renames it to the new version with the date. Where possible,
entries are drawn from conventional-commit history since the last tag.

Longer-form release notes live in `docs/releases/vX.Y.Z.md` and seed the GitHub
Release body.

## 5. The release workflow

The permanent sequence, from change to verified deployment:

```
Commit → Push → Build → Deploy → Verify → Report running version → Tag → Generate changelog → GitHub Release
```

1. **Commit** — conventional-commit messages on a branch; bump the root
   `package.json` version when cutting a release.
2. **Push** — to `origin/main` (GitHub is the canonical source repository).
3. **Build** — `omnio-release` computes build metadata and builds all images
   with it as build args.
4. **Deploy** — recreate the affected containers on the Oracle VPS (the
   canonical runtime environment) from the freshly built images.
5. **Verify** — `omnio-version-check` confirms the deployed version and commit
   equal the source of truth; Oracle and GitHub must report identical versions.
6. **Report** — print the running version, commit, branch, build date, and the
   Oracle/GitHub synchronization status.
7. **Tag** — annotated git tag `vX.Y.Z-stage.N` at the released commit; push it.
8. **Changelog / Release** — finalize the `CHANGELOG.md` entry and create the
   GitHub Release from `docs/releases/vX.Y.Z.md`.

### Deployment synchronization invariant

- **GitHub** is the canonical source repository.
- **Oracle VPS** is the canonical runtime environment.

Every deployment verifies: the latest commit is pulled, the latest commit is
running, the version matches, the build timestamp is recorded, and containers
were rebuilt when required. The two must never disagree on the running version.

## 6. Tooling

| Tool                                  | Role                                                                 |
| ------------------------------------- | ------------------------------------------------------------------- |
| `tooling/release/build-metadata.mjs`  | Portable: compute version/commit/branch/date/number from git        |
| `~/scripts/omnio-release`             | Oracle: build with metadata → deploy → verify → report              |
| `~/scripts/omnio-version-check`       | Oracle: compare running `/api/version` against GitHub source        |
