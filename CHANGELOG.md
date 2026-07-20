# Changelog

All notable changes to Omnio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Pre-release stages progress `alpha → beta → rc → stable`; see
[docs/architecture/09-releases.md](docs/architecture/09-releases.md).

## [Unreleased]

### Added

- **17 more tools** (98 total): Histogram, Color Blindness Simulator, Palette Export, ICO Viewer & Extractor, PDF Split by Size, Edit PDF Metadata, Video Inspector, Waveform Viewer, Audio Fade, TSV Table, HTML Preview, Checksum Compare, Bulk Rename, Prompt Diff, and Prompt Formatter — plus folder support in the Batch Processor. Every tool ships in English and Hebrew, runs entirely on-device, and is wired into search, categories, and Smart Actions through the same registry-driven `accepts` declarations as everything else.
- **Session workspace improvements** — pin any file (survives the size cap and "clear except pinned"), multi-select rows for bulk download or removal, and a visible count for anything beyond the first eight.
- **Smarter Smart Actions** — a transparent PNG now nudges toward keeping PNG/WebP instead of JPEG, an oversized PDF (>15MB) nudges toward Split by Size, a large ZIP (>50MB) nudges toward browsing before extracting everything, and dropping several files with repeated names nudges toward Bulk Rename.

### Fixed

- **Every drop zone in the app relabeled for accessibility.** Roughly twenty tools nested a keyboard-focusable file input inside a decorative `role="button"` div with no accessible name on the input itself — both real WCAG failures, confirmed by axe on every affected page. Replaced with a `<label>` wrapping the input: natively clickable and keyboard-operable with no ARIA or key handling needed, and no interactive-in-interactive nesting. Drag-and-drop, click-to-browse, and keyboard activation were all re-verified working after the change.

- **📦 Universal export & import** — Settings → Backup & restore downloads your favorites, collections, and workflows as one portable JSON; importing restores them. Saved workspaces export individually as `.omnio.zip` (manifest + files) and import back complete. Everything stays local — the backup file goes wherever you put it, nowhere else.
- **✨ AI category opens (local-first)** — Prompt Variables (write a template with {{placeholders}}, fill the generated form, copy the finished prompt) and Token Estimator (characters, words, heuristic token count, and whether it fits common context windows). No cloud calls — the template/estimate contracts are designed so providers can plug in later without a UI redesign. **All 13 categories now have working tools.**
- **Five more tools** (82 total): SVG Optimizer (safe cleanups only — comments, metadata, editor cruft; paths untouched; unit-tested), Contact Sheet (labeled image grid PNG), Video Thumbnail Sheet (evenly sampled, timestamped storyboard), plus the two prompt tools.

- **💾 Saved Workspaces** — save the current session (files and outputs included) under a name, then open, rename, duplicate, or delete it from the dashboard. Stored in your browser's IndexedDB on this device only — opening a workspace pours its files straight back into the session strip.
- **📁 Batch 2.0** — drop entire folders (nested included) onto the Batch Processor: structure is preserved inside the output ZIP. Plus output naming templates ({name}, {index}) and an explicit "Add a folder…" picker.
- **Five more tools** (77 total; Video and Office categories open): Watermark PDF, Number Pages, PDF Metadata viewer, Frame Extractor (scrub any video, save PNG stills one-by-one or as ZIP), and CSV Table (a proper RFC 4180 parser behind a clean table view).
- **Workflow editing** — saved workflows can now be edited in place: rename, re-emoji, reorder, duplicate, insert, and delete steps.

- **🗃️ Session workspace** — every file you drop (and every output a chain produces) is remembered for the current session and listed on the dashboard. Click a row to re-open its smart actions — nothing has to be dragged twice. Memory only: a reload starts fresh, nothing is stored or uploaded.
- **Multi-file intelligence** — drop several files at once and get a project-style summary (count, total and average size, largest/smallest, type breakdown) plus the actions that take the whole set: Batch Processor, Merge PDFs, Create ZIP, Image Compare.
- **🔍 Compare with original** — after compressing an image, one click opens Image Compare with the original on one side and your result on the other, divider ready.
- **Pipeline templates** — the workflow builder now starts from ready-made pipelines (🖼️ Image Optimization, 📄 PDF Cleanup, 🔐 Share Safely), fully editable before saving.
- **Three more tools** (72 total): HTTP Header Parser (25 well-known headers explained in plain language, en+he), robots.txt Tester (RFC 9309 longest-match with wildcards and anchors, unit-tested), and Filename Cleaner (cross-platform-safe names, reserved-name guards).

- **📚 Batch Processor for images** — drop dozens of images, set one rule set (longest side, output format, quality), and process them all with live progress. Download everything as one ZIP or file by file; re-encoding strips metadata across the whole batch. The universal drop zone routes multiple images straight to it.
- **🔗 Workflow chaining** — after cropping, resizing, or compressing an image, a "Continue with" row sends the *result* straight into the next tool (compress → remove metadata → watermark …) with the file already loaded. No re-download, no reopening tools.
- **Ten more tools** (69 total): Batch Processor, Favicon Generator (full 16–512px set + HTML snippet, zipped), QR Generator, XML Formatter & validator, HTTP Status Codes (all 46 with plain-language one-liners in both languages), MIME Types lookup, URL Inspector (parse + edit query parameters), Password Strength (entropy + crack-time, never leaves the device), Timezone Converter, and Salary Converter.
- **Search, rounder** — "picture" and "photo" find image tools, "resize" surfaces the compressors (and vice versa), plus aliases for QR, favicon, timezone, MIME, and friends.

- **🪄 Universal File Intelligence** — Omnio's signature move. Drag a file anywhere in the app (or paste an image or screenshot) and Omnio inspects it on the spot — type, size, dimensions, page count, archive contents, audio duration, JSON validity, embedded location data — then suggests an ordered list of everything it can do, with plain-language recommendations ("Large file — worth compressing", "Strips the embedded location data"). Choosing an action opens the tool with the file already loaded. Every suggestion comes from the modules' own declared file support, and every byte stays on your device.

- **🔎 Typo-tolerant search** — the palette now ranks results on a real scoring ladder (exact → prefix → word-prefix → substring → in-order letters → typo within one or two edits), so "pasword", "regx", or "cronn" still land on the right tool. Favorited and recently used tools get a small boost among equals.
- **⌨️ Keyboard shortcuts reference** — a quiet card listing every global shortcut, one palette command away.
- **Palette upgrades** — a Recently-used group at the top, and a no-results state that offers category shortcuts and a search tip instead of a dead end.
- **📦 Archives opens** — Create ZIP (bundle any files, duplicate names auto-suffixed) and Extract ZIP (browse entries, save one or all), via fflate in the browser. Entry names are sanitized against path-traversal tricks.
- **🎵 Audio opens** — Audio Trimmer: decode any browser-supported format, pick a start and end, preview the selection, export 16-bit WAV. The encoder is dependency-free and unit-tested.

- **🗂️ Collections** — group tools your way (💼 Work, 🖼️ Photo prep, anything). Create, rename, and delete from the dashboard; add or remove any tool from its page header. Collections appear on the dashboard, in the sidebar, and in the command palette — stored only on this device.
- **⚡ Workflows** — chain tools into a repeatable routine (Resize → Compress → EXIF Remove) and run it as a guided sequence: each tool page shows the workflow strip with progress dots and Back / Next step / Exit. Local-only, like everything personal.
- **Four more tools** — Watermark (text overlay with position/size/opacity), Image Compare (slider divider between two images), Metadata Viewer (file facts plus a dependency-free JPEG EXIF reader that flags embedded GPS data), and Reorder Pages for PDFs. The library now counts 56 tools.
- **🧩 Modules page** — every module listed with its version, category, status, and tool count; the layout is ready for community modules when the ecosystem opens.
- **Smarter search** — the palette now understands aliases and synonyms: "guid" finds the UUID generator, "regexp" finds the regex tester, "optimize" finds the compressors.
- **Tool page quick actions** — copy a link to any tool, add it to a collection, or star it, straight from the header; flagship tools now carry a short 💡 Tips section.

- **Home is now a real dashboard** — 👋 a short welcome that states the local-first promise, ⭐ favorites, 🕘 recently used (with when and from which category), 🔥 frequently used, 🆕 what's new pulled straight from this changelog, and 📂 the category grid. All personal sections come from this device's local storage only.
- **A full Images toolbox** — Crop (aspect presets + live preview), Rotate & Flip, Compressor (live before/after size), Filters (grayscale/blur/sharpen), Color Picker with dominant-palette extraction, EXIF Remover, and an Aspect Ratio calculator join the Resizer. Eight tools, all canvas-based, all entirely on your device.
- **The PDF category opens** — Merge (reorderable list), Extract Pages, Rotate, and Delete Pages, powered by pdf-lib running in the browser. Documents never leave the device.
- **Favorites everywhere** — star a tool from its page header or any card; pinned tools now appear on the home dashboard, in their own sidebar section, and as a command-palette group. Stored locally, no account involved.
- **Related tools** under every tool page — up to four siblings from the same category, so finishing one task flows into the next.

- **Five new tools** — Cron Explainer (break a crontab expression into plain fields and preview its next runs), Permission Calculator (Unix chmod between octal, symbolic, and checkboxes), Compound Interest (savings growth with monthly contributions and a year-by-year table), IP Address Inspector (classify IPv4/IPv6 and convert between notations), and Image Resizer (resize and convert to PNG/JPEG/WebP entirely in the browser — images never leave the device). Every tool ships with English + Hebrew copy, RTL-aware layout, and unit tests, and appears in search, categories, and the command palette automatically.
- **Emoji category tiles** — the home grid and category pages now carry one emoji per category as a recognition anchor (🖼️ 📝 💻 📈 🔐 🧰 🌐 …), always `aria-hidden` so screen readers hear only the category name. Compact navigation (sidebar, command palette) keeps monochrome icons.
- **Changelog section accents** — Keep-a-Changelog sections are typed at a glance (✨ New, 🔧 Changed, 🐛 Fixed, 🔐 Security), and inline `code` and **bold** in entries now render instead of showing raw Markdown markers.
- **A first-run favorites hint** — a brand-new install shows one quiet ⭐ hint that tools can be starred; it disappears as soon as anything is pinned or used.

- **Four visual styles** — Classic (the original), **Modern** (new default: warmer neutrals, rounder corners, a bolder focus ring), Minimal (near-grayscale, tightest radii, flat shadows), and Accessible (AAA contrast and bold borders by default, 4px focus ring). Switchable and fully reversible from the theme menu, Settings → Appearance, or the command palette; persisted per device. Every style clears the same WCAG AA/AAA gate.
- **Five accent colors** — Indigo (default), Blue, Purple, Green, Orange — independent of style, so any style can wear any accent. 1,925 automated contrast assertions cover every style × accent × theme × contrast-mode combination.
- **Density control** — Compact, Comfortable (default), or Large — scales shared control heights (buttons, inputs, selects) app-wide from one Settings switch, for bigger touch targets on demand.
- **Expanded Settings** — restructured into General, Appearance (theme/style/density/accent), Accessibility (high-contrast toggle + a one-click Accessible-style shortcut), Language, and Behavior (auto-open Activity tray toggle) — each section a real, working setting, no placeholders.
- **Platform Statistics page** (`/stats`, replacing the local usage-stats page) — General facts (tool count, category count, version, build date) always shown; Usage and Popularity (most-used tools/categories, total/average executions, trending) read from the platform's opt-in, anonymous, instance-wide analytics aggregate, with an honest explanation shown instead of data when analytics is off.
- **`GET /api/v1/analytics/stats`** — read-only, unauthenticated aggregate endpoint over the existing `ToolEvent` table (decision D5); still off by default, still no per-user data.
- **Copy Debug Information** on the About page — one click copies a short technical summary (version, commit, branch, mode, environment, Node, platform, service statuses) formatted for pasting into a bug report.

### Changed

- Tool pages use more of the screen (wider frame) and carry a favorite star and related-tools footer.
- Recently-used tracking now remembers when and how often each tool was launched (still local-only), powering the dashboard's Recent and Frequent sections.
- **Empty categories are hidden until they earn a tool.** Categories with nothing in them no longer appear on the home grid, the sidebar, or the command palette — visibility is derived from the tool registry, so a category reappears automatically the moment its first tool ships. Images is the first to graduate, unlocked by the Image Resizer.
- The sidebar's category list now shows a per-category tool count, and the home header states Omnio's promise outright: everything runs in your browser — your data never leaves your device.
- **History removed from the UI.** The personal per-run log (`/history`: timestamps, statuses, re-downloads) is gone, along with the local per-device usage counters that briefly replaced it. Live job tracking during a run (the Activity tray, SSE progress, downloads) is unaffected — only the after-the-fact personal record was removed, in favor of anonymous platform-wide statistics.
- The About page's Project/Runtime/Services sections were reorganized and now include an overall health summary.

### Security

- Usage statistics never carry a per-user or per-run field — the `analytics.stats` response is limited to `{ toolId, count }`, and the underlying table has no user column at all, so this data cannot become personal even if multi-user mode is enabled later.

### Fixed

- Markdown preview's inline code-span placeholder used a raw NUL byte as its delimiter, tripping `no-control-regex`; switched to an explicit U+E000 (Private Use Area) escape with no behavior change (7/7 tests unaffected).
- Removed a vestigial `eslint-disable react-hooks/exhaustive-deps` comment in the password generator referencing a plugin that isn't part of the shared lint config, which failed lint outright.
- The accent-color picker in Settings now implements real WAI-ARIA `radiogroup` keyboard navigation (roving tabindex, RTL-aware arrow keys) instead of a mouse-only control with unearned ARIA roles.

## [0.1.0-alpha.1] - 2026-07-18

First public alpha. Omnio becomes a professionally versioned, releasable product:
a self-hosted personal workspace with 36 on-device browser tools, an end-to-end
worker pipeline, and a permanent release-management system.

### Added

- **Semantic versioning & release infrastructure** — canonical version, a
  generated `release.json` manifest (single source of truth) embedded in the
  image and served whole from `GET /api/version`, a `GET /api/health` service
  report, an About system-information page (General / Deployment / Runtime /
  live Services / Project), an in-app Changelog, a footer version badge, this
  changelog, and a documented Commit → Push → Build → Deploy → Verify → Tag
  workflow that prints a deployment summary proving Oracle matches GitHub.
- **Browser-tier tools (M7)** — 36 tools across 31 modules, all running entirely
  on your device, in English and Hebrew with full RTL: JSON/YAML/CSV converters,
  JWT decode, Base64/URL/HTML/binary encoders, number-base, UUID, hash and
  password generators, case convert, Lorem Ipsum, text stats/diff, slugify, regex
  tester, Markdown preview, line tools, unit/color/timestamp/date/Roman
  converters, WCAG contrast checker, CSS gradient builder, BMI, random numbers,
  loan/VAT/percentage/tip calculators, and a CIDR/subnet calculator.
- **End-to-end journey (M6)** — first-run setup → login → workspace → file drop
  → upload → job enqueue → live SSE progress → downloadable result → history.
- **Client workspace (M5)** — tool launcher, favorites and recent tools, global
  file drop, universal on-device viewer foundation, "/" quick-open, command
  palette, responsive + RTL shell.
- **Module system (M4)** — `modgen` auto-discovers modules and generates the
  search index, category pages, palette entries, and app dependency wiring.
- **Platform foundations (M1–M3)** — pnpm + Turborepo monorepo, Next.js web,
  NestJS api, BullMQ worker, PostgreSQL + Redis, Prisma, the design system, and
  the ts-rest typed contract.

### Changed

- **Deployment mode defaults to `personal`** — no authentication, no login, no
  setup wizard; immediate use as a self-hosted personal workspace. Set
  `OMNIO_MODE=multi-user` for the single-admin auth model with sessions.
- **Cloudflare Tunnel is the only ingress** — Internet → Tunnel →
  `127.0.0.1:4200` (web). The api and worker are internal Docker services, never
  publicly exposed; Omnio no longer uses the shared Caddy for its own routing.

### Fixed

- Lost upload bytes from a stream-teeing race between hashing and storage.
- Web now proxies `/api/*` to the internal api service so same-origin browser
  calls work without a separate reverse proxy.

### Security

- Secrets live only in `~/.env.d/*.env`; none are committed.
- Personal mode intentionally disables authentication — this deployment is
  publicly reachable with no auth by explicit operator decision.
- Browser tools are hardened: the Markdown renderer escapes HTML before
  transforming and allow-lists link protocols; hashing/password use SubtleCrypto
  and bias-free crypto RNG; JWT decoding never claims to verify signatures.

### Known limitations

- Alpha: interfaces and data shapes may change between pre-releases.
- Personal mode has no authentication by design — do not expose an instance
  holding data you are unwilling to make public.
- Worker-tier tools (image/PDF/media processing) are not part of this release.
- No automated database backups are configured yet.

[Unreleased]: https://github.com/MordechaiN/Omnio/compare/v0.1.0-alpha.1...HEAD
[0.1.0-alpha.1]: https://github.com/MordechaiN/Omnio/releases/tag/v0.1.0-alpha.1
