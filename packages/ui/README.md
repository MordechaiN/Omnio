# @omnio/ui

The Omnio design system: tokens, primitives, and (soon) platform patterns. Everything visual in Omnio inherits from this package — modules never invent their own look.

## Architecture

**Tokens are TypeScript, CSS is generated.** `src/tokens/tokens.ts` is the single source of truth — an OKLCH palette plus type/space/radius/motion scales. `pnpm gen:tokens` compiles it to `src/styles/tokens.css` (committed; a test fails on drift). Two tests gate every palette change:

- `contrast.test.ts` — every declared foreground/background pairing must meet WCAG AA, and AAA for text roles in high contrast. ~100 assertions across light × dark × normal × high-contrast. If your color idea fails, the build fails; there is no "looks fine to me".
- `generated.test.ts` — the committed CSS matches the source exactly.

**Theming is attribute flipping, not React.** Themes switch via `data-theme` on `<html>` (next-themes), contrast via `data-contrast` (an independent axis — high contrast works on both light and dark). Components reference semantic Tailwind classes (`bg-surface`, `text-muted`, `border-strong`) that resolve to the custom properties; no component ever names a raw color.

**Ships as source.** This package has no build output besides tokens.css. Next.js consumes it via `transpilePackages`; Storybook and Vitest compile it directly. Imports use explicit `.ts`/`.tsx` extensions so Node can run the token generator natively with type stripping.

**RTL is structural.** Only logical properties (lint-enforced repo-wide). Sheet sides are `start`/`end`, slide keyframes flip with `[dir="rtl"]`, the progress bar fills from the inline start, and the `Icon` wrapper knows which lucide icons are directional (they mirror) and which are symmetric (they never do) — component authors don't decide.

## Usage

```tsx
// styles (once, in the app's global css):
@import "tailwindcss";
@import "@omnio/ui/styles/index.css";
@source "<path to packages/ui/src>";

// fonts (once, in the root layout):
import "@omnio/ui/fonts";

// components:
import { Button, Dialog, useTheme } from "@omnio/ui";
```

Providers expected at the app root: `ThemeProvider`, `ContrastProvider` (+ its `contrastInitScript` inlined in `<head>` to prevent a contrast flash), `TooltipProvider`.

## Storybook

`pnpm storybook` — every primitive documented with variants and states, under a **Theme × Direction × Contrast** toolbar matrix, with the a11y addon set to fail on violations. `pnpm storybook:build` runs in CI.

## Extending

- New primitive: one file in `src/components/`, tokens-only styling, keyboard + ARIA verified, a story, an export in `src/index.ts`.
- New pattern (ToolShell, DropZone, FileCard… arriving M4+): same rules, plus a design-doc note in `docs/architecture/05-design-system.md`.
- New theme: a new object satisfying `ColorTheme` in tokens.ts — the contrast test immediately tells you which pairings fail.

## Deliberate tradeoffs (recorded, revisitable)

- **CSS animations instead of Framer Motion.** Radix `data-state` + keyframes cover current motion needs at zero bundle cost; Framer Motion enters only when a surface genuinely needs springs/gestures (e.g. drag interactions in the file manager).
- **Fontsource instead of `next/font`.** Self-hosted variable fonts as npm packages — no font binaries committed to the repo, no CDN calls, works identically in Storybook and Next.
- **Stories grouped by domain** (buttons, overlays, feedback…) rather than one file per component — right-sized while the library is ~27 components; split when it grows.
