# Design System

**Status:** Approved 2026-07-11 (M0 complete)
**Package:** `@omnio/ui` — tokens, primitives, patterns. The visual identity of the platform.

## 1. Design position

Omnio sits at the intersection of Linear's restraint, Raycast's density, and Notion's friendliness. Concretely:

- **Calm surfaces, quiet chrome.** The user's file and the tool's result are the heroes; the UI recedes. Low-contrast borders, generous whitespace, no gradients-for-decoration.
- **Density with air.** Desktop layouts are information-dense like Linear, never cramped; spacing scale is generous by default.
- **One accent, used sparingly.** A single brand accent for primary actions and focus; everything else is neutral. Tools do not get their own colors — category icons carry hue, surfaces stay neutral.
- **Motion as feedback, never as decoration.** 120–200ms ease-out transforms/fades for state changes; nothing moves that the user didn't cause. Reduced-motion collapses everything to fades.

## 2. Tokens

All tokens are CSS custom properties on `:root`, switched by `[data-theme]` — theming without re-rendering React. Tailwind consumes tokens (semantic classes like `bg-surface`, `text-muted`, `border-subtle`), so **no component ever names a raw color**. That rule is what makes light/dark/high-contrast/future-themes a data problem instead of a refactor.

**Color.** Neutral scale (12 steps, OKLCH-derived so light/dark are perceptually matched) + accent scale + semantic roles: `bg`, `surface`, `surface-raised`, `border-subtle`, `border`, `text`, `text-muted`, `accent`, `success`, `warning`, `danger`, `info`. Every text/background pairing in the semantic set meets WCAG AA (4.5:1 body, 3:1 large text) — verified by a token test, not by eyeballing.

**Themes (day one):** `light`, `dark`, `system` (default, live-follows OS), `high-contrast` (AAA-targeted, borders everywhere, no translucency). Persisted per user; pre-hydration inline script prevents theme flash.

**Typography.**

- Latin: **Inter** (variable). Hebrew: **Noto Sans Hebrew** (variable) — stacked as one family so mixed-script lines set cleanly; both self-hosted via `next/font` (air-gap rule: no font CDNs).
- Mono: **JetBrains Mono** for code, hashes, JSON — a first-class citizen given the developer-tools surface.
- Scale: 12/13/14(base)/16/18/22/28/36 with tight line-heights on headings, relaxed on body. Tabular numerals for tables, sizes, and calculator outputs.

**Space & shape.** 4px base unit; component spacing from the scale only. Radii: 6 (controls), 10 (cards), 16 (modals/sheets). Shadows: two subtle elevation levels in light; dark mode elevates with surface lightness instead of shadow (shadows on dark are mud).

**Motion tokens.** `fast 120ms`, `base 160ms`, `slow 240ms`, one standard ease-out and one spring (Framer) for sheet/palette entrances. No animation exceeds 300ms.

## 3. Primitives and patterns

Layer 1 — **primitives** (shadcn/ui over Radix, restyled with tokens): Button, Input, Select, Checkbox, Switch, Slider, Dialog, Sheet, Popover, Tooltip, Tabs, Toast, DropdownMenu, Command…

Layer 2 — **platform patterns** (Omnio-specific, where the identity lives):

| Pattern                               | Role                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `ToolShell`                           | The standard tool surface ([04-frontend.md](04-frontend.md) §3)                                  |
| `DropZone`                            | Input-zone and full-viewport variants; drag, paste, picker; file-type hints from manifests       |
| `FileCard` / `FileList`               | Icon by type, size/date via `Intl`, TTL badge for scratch files, action menu from capability map |
| `JobProgress`                         | Determinate/indeterminate, streamed via SSE, cancel affordance, `aria-live`                      |
| `ResultPane`                          | Preview, download, copy, "send to…" chaining                                                     |
| `CategoryTile`, `ToolCard`            | Home/category grids; icon + name + one-liner, pin affordance                                     |
| `EmptyState`                          | Friendly, instructive, illustrated by icon composition (no mascot clip-art)                      |
| `PrivacyBadge`                        | "Runs on your device" marker for browser-tier tools — brand-level pattern                        |
| `StatCard`, `LogViewer`, `QueueTable` | Admin surfaces                                                                                   |

Layer 3 — **icons:** lucide exclusively, 1.5px stroke, sized 16/20/24. Directional icons flip in RTL via the `ui` icon wrapper; symmetric ones don't (the wrapper knows which is which — authors never decide).

## 4. Voice

Interface copy is plain, short, and confident. No jargon in user-facing errors: never "ECONNREFUSED", always "The processing service isn't reachable — check that the worker container is running", with the technical detail one disclosure away. Hebrew copy is written, not translated word-by-word — it must read as native. Buttons are verbs ("Merge PDFs", not "Submit").

## 5. Governance

- The design system is documented in Storybook (built in CI, published with docs) — every primitive and pattern, in light/dark/high-contrast × LTR/RTL.
- New patterns require a ui-package PR — modules cannot introduce one-off visual patterns (lint rule: modules import styling only from `@omnio/ui` and semantic Tailwind classes).
- Visual regression (Playwright screenshots) on primitives and ToolShell across all four theme/direction combinations.

## 6. Implementation record (M2) — deltas from this spec

Built as designed, with four recorded deviations (rationale in `packages/ui/README.md`):

1. **Motion:** Framer Motion is deferred. All current motion is CSS — Radix `data-state` animations plus bespoke logical keyframes (sheet slides flip under `[dir="rtl"]`). The spring token exists as a CSS easing. Framer Motion enters when a surface needs real physics/gestures, not before.
2. **Fonts:** self-hosted via Fontsource packages rather than `next/font` — no binaries in the repo, identical behavior in Next and Storybook, still zero external requests.
3. **High contrast is an axis, not a theme:** `data-contrast="high"` overlays either theme (the spec's single "high-contrast" theme would have forced a light-only assumption). AAA-targeted overrides exist for both light and dark; the contrast test enforces 7:1 for text roles in both.
4. **Visual regression:** CI currently gates with axe (WCAG AA, four pages + dark) and functional e2e in both directions. Pixel-screenshot baselines are deliberately postponed until a dedicated consistent-rendering runner exists — cross-environment screenshot diffs produce false reds that train people to ignore CI.
