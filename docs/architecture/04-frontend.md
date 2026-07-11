# Frontend & UX Architecture

**Status:** Approved 2026-07-11 (M0 complete)
**Stack:** Next.js App Router · React · TypeScript · Tailwind · shadcn/ui · Framer Motion · TanStack Query · Zustand · React Hook Form + Zod · next-intl

## 1. The app shell

Omnio should feel like a desktop app that happens to run in a browser. One persistent shell, three entry points (search, categories, file-drop), zero full-page reloads.

```
┌────────────────────────────────────────────────────────────┐
│  ⌘K Search…                                    ☾  ⚙  👤   │  top bar
├──────────┬─────────────────────────────────────────────────┤
│ Home     │                                                 │
│ ─────    │                                                 │
│ Images   │              workspace area                     │
│ PDF      │   (tool surfaces, viewer, category grids)       │
│ Video    │                                                 │
│ …        │                                                 │
│ ─────    │                                                 │
│ Pinned   │                                                 │
│ Recent   │                                                 │
├──────────┴─────────────────────────────────────────────────┤
│  uploads/jobs tray (collapsible, global)                   │
└────────────────────────────────────────────────────────────┘
        + full-viewport drop overlay on dragenter, everywhere
```

Shell invariants:

- **Global dropzone.** Dragging a file anywhere dims the app and shows the drop target; dropping opens the file-action sheet ([03-module-system.md](03-module-system.md) §5). Paste (⌘V) of files/images behaves identically.
- **Command palette (⌘K)** is the primary navigation. Fuzzy, typo-tolerant, instant — tools, categories, commands ("toggle theme"), recents, favorites. Client-side index (MiniSearch over `registry.search.ts`), so it works offline and costs the server nothing.
- **Jobs tray** is global: uploads and worker jobs are visible from anywhere, survive navigation, stream progress over SSE.
- Sidebar collapses to icon rail; on mobile the shell becomes bottom-nav + sheet-based surfaces. Mobile-first breakpoints, desktop-excellent layout.

## 2. Routing

```
/                       home: search hero, categories, recents, pinned
/t/[category]           category grid
/t/[category]/[tool]    tool surface (each tool = own chunk, own URL, shareable)
/viewer/[fileId]        universal viewer
/files                  workspace (kept files, scratch with TTL badges)
/settings               theme, language, retention, analytics opt-in
/admin/*                hidden admin (dashboard, queues, storage, audit, modules)
```

Every tool has a stable, human-readable URL — deep-linkable, bookmarkable, SEO-honest for public instances. Tool state that matters (options) serializes to query params where cheap, so links reproduce setups.

## 3. The ToolShell contract

The reason 1,000 tools can stay consistent. Every tool surface renders inside a standard frame owned by `@omnio/ui`:

```
┌──────────────────────────────────────────────┐
│ icon · Tool name              ☆ pin · ? help │  header (from manifest/i18n)
│ one-line description                          │
├──────────────────────────────┬───────────────┤
│                              │   options     │
│   input zone                 │   (RHF+Zod    │
│   (drop / paste / pick /     │    form from  │
│    text area — per tool)     │    the tool's │
│                              │    schema)    │
├──────────────────────────────┴───────────────┤
│   [ Run ]              progress / streaming  │
├──────────────────────────────────────────────┤
│   result zone: preview · download · copy ·   │
│   "send to another tool" (capability chain)  │
└──────────────────────────────────────────────┘
```

A tool author supplies: the input configuration, the options schema, the run function (per its tier), and a result renderer. ToolShell supplies: layout, responsive behavior, RTL, keyboard handling, focus management, progress UI, error presentation, the "runs on your device" privacy badge for browser-tier tools, and result actions — including **"send to…"**, which feeds a tool's output back through the capability map so users chain tools (resize → compress → convert) without re-uploading.

Tools with genuinely bespoke surfaces (the PDF viewer, image crop canvas) use `ToolShell.Custom`, keeping header/result contracts but owning the middle.

## 4. State management

| Concern                                                           | Owner                                                                              |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Server state (files, jobs, settings)                              | TanStack Query over the ts-rest client — caching, retries, SSE-driven invalidation |
| UI state (palette open, tray, dropzone)                           | Zustand — small, no boilerplate                                                    |
| Form state                                                        | React Hook Form + the tool's Zod schema                                            |
| Persistent client prefs (recents, pinned, theme before hydration) | `localStorage` with schema-versioned migration; synced to server when signed in    |

No global state framework beyond this. Browser-tier tool executions are plain async functions with AbortController — no server round-trip, nothing to cache.

## 5. i18n & RTL — native, not retrofitted

- **next-intl** with locale segment routing; ICU messages; catalogs per module (`i18nNamespace`), merged at build.
- **Hebrew and English are both first-class.** CI fails on key-parity violations between `en` and `he`.
- **Physical CSS properties are banned** (`ml-*`, `pl-*`, `left-*`, `text-left`…) — lint-enforced. Only logical properties/utilities (`ms-*`, `ps-*`, `start-*`, `text-start`). This single rule eliminates the entire class of RTL hacks.
- `dir` is set at the `<html>` level from locale; direction-semantic icons (arrows, chevrons) flip via a `ui` wrapper that knows which icons are directional and which (media controls, checkmarks) are not.
- Numbers, dates, file sizes format through `Intl` with the active locale.
- Playwright visual smoke runs key screens in both `ltr` and `rtl` — RTL regressions fail CI, not user reports.

## 6. Accessibility (WCAG 2.1 AA)

- shadcn/ui = Radix primitives: focus management, ARIA, keyboard behavior come from the platform, not from every tool author.
- Visible focus rings always (`:focus-visible`, tokenized style); skip-to-content; landmarks; `aria-live` for job progress and results.
- Full keyboard map: ⌘K palette, `/` focus search, `?` shortcut sheet, arrows in grids, Esc closes topmost layer.
- Touch targets ≥44px; contrast enforced by the token palette ([05-design-system.md](05-design-system.md)); `prefers-reduced-motion` collapses all motion to opacity fades (Framer Motion `MotionConfig reducedMotion="user"` — one line, global).
- axe checks in Playwright CI for shell + top tool surfaces.

## 7. Performance

- **Per-tool code splitting** via modgen's `next/dynamic` registry — the shell ships small; each tool loads on demand and is prefetched on hover/focus of its link.
- Heavy browser-tier engines (WASM codecs, pdf.js, syntax highlighters) load lazily inside the tool chunk, with skeletons.
- Streaming SSR for shell + category pages; static generation where content is static; `next/font` self-hosted fonts (no external requests — air-gap rule).
- Uploads stream with progress; downloads stream from the storage driver — no buffering whole files in memory anywhere in the pipeline.
- Budgets in CI (size-limit): shell JS < 200KB gz initial; tool chunks measured per-PR with regressions flagged.
- PWA (installable, offline shell + browser-tier tools) is a fast follow after v1 — the architecture (client-side registry/search, browser tier) already makes offline mostly free.
