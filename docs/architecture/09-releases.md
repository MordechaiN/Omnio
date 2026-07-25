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

### The release manifest (`release.json`)

`tooling/release/gen-manifest.mjs` writes a canonical **`release.json`** — the
single machine-readable source of truth for a build. It is generated
automatically during every build (regenerated inside the api image from the
build args) and committed to the repo; it is never hand-edited. It holds the
build-time-immutable fields plus the build environment's node/pnpm/os/arch and
the Docker image tags. The running api reads it and overlays the live runtime
fields (hostname, os/arch, node, redis version, environment, mode) before
serving the **complete** manifest at `GET /api/version`.

It is available from all four surfaces: the **repository** (committed), the
**Docker image** (baked), the **running API** (`/api/version`), and the **About
page** (which fetches the API).

The **web** tier receives them as `NEXT_PUBLIC_OMNIO_*` (inlined into the client
bundle at build). The **api** tier receives them as `OMNIO_*` env (read at
runtime). The immutable fields describe the build; mode and environment describe
the running deployment and are read live, so they are always current.

## 3. Surfaces

- **`GET /api/version`** — the running api's own report: the **complete release
  manifest** (version, channel, commit, branch, build number/timestamp,
  environment, mode, docker images, hostname, os, arch, node, pnpm, database,
  redis). Unauthenticated deployment metadata (like `/healthz`). The canonical
  "what is running" source.
- **`GET /api/health`** — live three-state status (`healthy`/`warning`/`offline`)
  for API, database, redis, worker, and storage. Drives the About page's
  Services section and the deployment summary.
- **Footer** — `Omnio · vX.Y.Z-stage.N · Commit <sha>` on every page; the
  version links to About.
- **About page** (`/about`) — the system-information page: General, Deployment,
  Runtime, Services (live), and Project (license, repository, documentation,
  changelog, release notes).
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
| `tooling/release/gen-manifest.mjs`    | Portable: write the canonical `release.json` (single source of truth) |
| `~/scripts/omnio-release`             | Oracle: build with metadata → deploy → verify → deployment summary  |
| `~/scripts/omnio-version-check`       | Oracle: `/api/version` + `/api/health` summary vs GitHub source      |

## Permanent standards (platform-wide)

These are mandatory for every future Omnio release.

### Semantic Versioning

- The **root `package.json` `version` is the single source of truth.** Everything
  else (commit, build number, date) is derived at build time and injected as
  build args; **no version value is ever duplicated or hand-typed elsewhere.**
- Use SemVer with staged pre-releases: `alpha → beta → rc → stable`, e.g.
  `0.8.0-alpha`, `0.16.0-beta`, `0.17.0-rc1`, `1.0.0`. Displayed `v`-prefixed.
- **Every meaningful release increments the version.** End users are never shown
  only a build number or commit hash as the identity of a release.
- Every release carries: product version, release date, build number, git commit,
  release notes (What's New), and the About page.

### Where the version is displayed (all fed from the single source)

About · Settings · What's New · Footer (compact) · `GET /api/version`.

### What's New = the official product release history

- Written **only in user language.** Never developer terms — no refactor,
  dependency, webpack, pdf-lib, qpdf, worker, wasm, lint, typecheck, commit, or
  internal architecture. Explain *what the user gained*, nothing else.
- Every release uses exactly this structure (omit a section if empty):

  ```
  🚀 New
  ✨ Improved
  🐞 Fixed
  ⚠️ Known limitations
  ```

  In `CHANGELOG.md` these are `### New` / `### Improved` / `### Fixed` /
  `### Known limitations`. The style stays identical across every release — it
  should read as one consistent product over many years.

### Check for updates

Settings has a **Check for updates** action. Today it reports "You're using the
latest version." (the running deployment is authoritative; no upstream feed). The
architecture (`use-update-check.ts`) is shaped so a real release-manifest compare
slots in later without changing callers or UI.


## Localized release notes

Release notes are **product copy**, not documentation, and are written in every
supported language rather than machine-translated at runtime.

The source of truth for a release's user-facing notes is a single file:

    content/releases/<version>.json

It holds every language side by side:

```json
{
  "version": "0.9.0-alpha",
  "date": "2026-07-25",
  "headline": { "en": "…", "he": "…" },
  "sections": [
    { "type": "new", "items": [ { "en": "…", "he": "…" } ] }
  ]
}
```

Keeping the languages in one file is what keeps them synchronised: a release
cannot gain an English line and quietly leave the others behind, because they
are edited together. `apps/web/src/lib/releases.test.ts` fails the build if any
release is missing a language the product supports.

Section types are limited to `new`, `improved`, `fixed` and `known`; the page
supplies the localized heading for each, so section names are never written into
the content.

The What's New page renders only the reader's language. A line with no text in
that language is dropped rather than shown in another — mixed languages read as
a bug in the product, and an incomplete list is the smaller problem.

`CHANGELOG.md` remains, in English, as the developer-facing history. It is not
what the product displays.
