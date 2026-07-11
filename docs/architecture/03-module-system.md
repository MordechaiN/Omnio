# Module System & Plugin Architecture

**Status:** Approved 2026-07-11 (M0 complete)

The module system is the platform. It must let the tool count grow by two orders of magnitude without the core growing at all, keep every tool consistent, and eventually let outsiders extend Omnio without being able to hurt its users.

## 1. The manifest

Every module has a `module.json`, validated against a Zod schema exported by `@omnio/module-sdk`. The manifest is the module's _entire_ public identity — everything the platform knows about a module, it knows from here.

```jsonc
{
  "$schema": "https://omnio.dev/schemas/module.v1.json",
  "id": "pdf",
  "version": "1.0.0",
  "category": "pdf", // one of the platform categories
  "icon": "file-text", // lucide icon name
  "i18nNamespace": "mod-pdf", // names/descriptions live in i18n catalogs
  "tools": [
    {
      "id": "pdf-merge",
      "tier": "worker", // browser | server | worker
      "tierReason": "requires qpdf", // mandatory for server/worker tiers
      "surface": "frontend/tools/merge",
      "accepts": [{ "mime": ["application/pdf"], "multiple": true, "maxSizeMB": 200 }],
      "produces": [{ "mime": "application/pdf" }],
      "keywords": ["combine", "join"], // extra search terms (i18n-keyed)
      "limits": { "timeoutSec": 120, "memoryMB": 512 },
    },
  ],
  "capabilities": {
    "fileActions": [
      // powers the "drop a file" flow
      { "toolId": "pdf-merge", "verb": "merge", "rank": 30 },
    ],
  },
  "permissions": [], // first-party: informational; third-party: enforced
  "worker": { "queues": ["pdf"], "binaries": ["qpdf", "ghostscript"] },
}
```

Design rules:

- **Names are i18n keys, never strings.** A module cannot exist in English only; CI enforces en/he parity.
- **`accepts` is machine-readable truth.** The file-drop flow, the "supported formats" page, and input validation all read the same declaration. No documentation drift possible.
- **`tierReason` is mandatory above browser tier** — the escalation rule from the system overview, enforced by schema.
- **Limits are declared, not hardcoded** — the worker enforces them; the admin UI displays them.

## 2. Discovery: build-time, zero registration

`tooling/modgen` runs before every build and dev session:

1. Globs `packages/modules/*/module.json`, validates each against the schema (build fails loudly on any violation — wrong shape, missing i18n keys, duplicate tool IDs, dead surface paths).
2. Emits **typed registries**:
   - `registry.web.ts` — tool metadata + `next/dynamic` lazy imports for every surface (each tool is its own chunk; the shell never pays for tools you don't open).
   - `registry.api.ts` — NestJS dynamic module list for modules with server parts.
   - `registry.worker.ts` — queue → processor map.
   - `registry.search.ts` — the client-side search index source (ids, categories, keywords, i18n keys).
3. Emits `capabilities.json` — the merged file-type → actions map.

Contributor experience: create a folder, run `pnpm dev`, your tool is in the app. No registration file to edit, no import to add, and everything is still statically typed and code-split.

## 3. Tool contracts (the SDK)

`@omnio/module-sdk` exports the interfaces every tool implements:

```ts
// browser tier — pure function of inputs, runs client-side
export interface BrowserTool<In, Out> {
  run(input: In, ctx: BrowserToolContext): Promise<Out>; // ctx: files, abort signal, progress
}

// worker tier — runs inside the sandbox, filesystem-scoped to the job dir
export interface WorkerTool<Opts> {
  process(job: ToolJob<Opts>, ctx: WorkerContext): Promise<ToolResult>;
  // ctx: scratch dir, exec() wrapper (the ONLY way to spawn binaries —
  // applies timeouts, resource limits, arg sanitization), progress reporter, logger
}
```

Key properties:

- **Options are Zod schemas** shared between the tool's frontend form (via RHF resolver) and its executor — one definition validates in the UI, on the API boundary, and in the worker.
- **`ctx.exec()` is the only subprocess path.** A worker tool physically cannot shell out around the sandbox policy; the wrapper owns argv construction (no shell interpolation), timeouts, and output caps.
- **Progress and cancellation are first-class** in every tier, so the UI behaves identically for a 10ms browser tool and a 5-minute video transcode.

## 4. Lifecycle

First-party modules: **validate (modgen) → compile in → migrate (module-owned Prisma migrations, tables prefixed `mod_<id>_`) → activate**. Admins can disable a module instance-wide (`Setting`-backed); disabled modules vanish from search, categories, and the capability map — routes 404, queues drain.

## 5. The file-action flow (drop a file → see everything)

1. Client identifies the file (extension + magic-byte sniff, client-side).
2. Looks up `capabilities.json` (shipped with the app bundle): MIME → ranked list of `{module, tool, verb}`.
3. Renders the action sheet: **View** (universal viewer) first, then actions by rank, grouped by module.
4. Selecting an action deep-links into the tool surface with the file pre-attached — browser tools receive the `File` handle directly; worker tools trigger upload + enqueue.

Because this reads the same declarations that validate inputs, the action sheet can never offer something the tool would reject.

## 6. Third-party plugins (post-v1, designed now)

Two lanes, one manifest format:

|          | First-party (v1)   | Third-party (post-v1)                   |
| -------- | ------------------ | --------------------------------------- |
| Lives    | in-repo, reviewed  | external repo/registry                  |
| Runs     | compiled into apps | **out-of-process**: own container       |
| Trust    | full               | manifest-declared permissions, enforced |
| Protocol | direct imports     | versioned HTTP/gRPC plugin protocol     |

The third-party lane is the only sound way to run untrusted code against private files: a plugin container gets a job-scoped mount, no network unless its manifest requests it _and_ the admin grants it, and speaks the same `ToolJob`/`ToolResult` shapes over the wire that first-party worker tools use in-process. Because both lanes share the manifest schema and tool contracts, a first-party module can be extracted into a plugin (or vice versa) without redesign.

What ships in v1 to keep this honest: the manifest schema is versioned and published, the SDK types are published under a permissive license (see decision D1), and nothing in the core assumes "all modules are compiled in" — the registries are data, not code paths.

## 7. Consistency at 1,000 tools

Scale safety comes from contracts, not review vigilance:

- Every surface renders inside `ToolShell` ([04-frontend.md](04-frontend.md) §3) — layout consistency is structural.
- Every option form is a Zod schema — validation consistency is structural.
- Every subprocess goes through `ctx.exec()` — security consistency is structural.
- Every string is an i18n key — localization consistency is structural.
- `modgen` fails the build on any manifest violation — metadata consistency is structural.

A reviewer of a new-tool PR checks the tool's _logic_; the platform has already enforced everything else.
