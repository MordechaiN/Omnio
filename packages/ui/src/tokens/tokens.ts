/**
 * The Omnio design tokens — single source of truth.
 *
 * Everything here is OKLCH: perceptually uniform, so light and dark are
 * genuinely matched rather than eyeballed, and future themes are data.
 * `scripts/generate-tokens.ts` compiles this file to `src/styles/tokens.css`;
 * `src/tokens/contrast.test.ts` refuses any palette change that breaks
 * WCAG AA (docs/architecture/05-design-system.md §2).
 *
 * Two independent axes, both data-driven (attribute on <html>, zero React
 * re-render to switch):
 * - **Theme**: `light` | `dark` — `[data-theme]`.
 * - **Style**: `friendly` (default) | `classic` — `[data-style]`. `friendly`
 *   is the shipped default and needs no attribute; `[data-style="classic"]`
 *   restores the original palette exactly, so the change is fully reversible.
 *
 * Identity notes:
 * - **Friendly** (default): neutrals carry a whisper of warm amber (hue ≈45,
 *   chroma ≤0.014) — soft and welcoming, never beige, never "cream page".
 *   Accent is a warm rose (hue 350) — distinct from every semantic hue
 *   (danger 27, warning 78, success 155, info 240) so it never reads as an
 *   alert. Radii are larger and the focus ring is thicker — friendlier
 *   corners, more obvious interaction states.
 * - **Classic**: the original palette — cool violet neutrals (hue ≈265) and
 *   a muted iris accent (hue 285), tighter radii, 2px focus ring. Selected
 *   via `[data-style="classic"]`; `classicLight`/`classicDark` below hold the
 *   exact original values, unchanged since M2.
 * - Semantic colors (success/warning/danger/info) never shift with style —
 *   meaning must stay stable regardless of visual identity.
 * - Dark mode elevates with surface lightness, not shadows.
 */

export type ColorTokenName =
  | "bg"
  | "surface"
  | "surface-raised"
  | "overlay"
  | "backdrop"
  | "border-subtle"
  | "border"
  | "border-strong"
  | "text"
  | "text-secondary"
  | "text-muted"
  | "text-disabled"
  | "accent"
  | "accent-hover"
  | "accent-active"
  | "accent-fg"
  | "accent-subtle"
  | "accent-subtle-fg"
  | "success"
  | "success-fg"
  | "success-subtle"
  | "success-subtle-fg"
  | "warning"
  | "warning-fg"
  | "warning-subtle"
  | "warning-subtle-fg"
  | "danger"
  | "danger-fg"
  | "danger-subtle"
  | "danger-subtle-fg"
  | "info"
  | "info-fg"
  | "info-subtle"
  | "info-subtle-fg"
  | "selection"
  | "focus-ring"
  | "shadow-1"
  | "shadow-2";

export type ThemeName = "light" | "dark";
export type StyleName = "friendly" | "classic";
export type ColorTheme = Record<ColorTokenName, string>;

/** Friendly (default) — light. */
export const light: ColorTheme = {
  bg: "oklch(0.977 0.003 45)",
  surface: "oklch(0.995 0.001 45)",
  "surface-raised": "oklch(1 0 0)",
  overlay: "oklch(1 0 0)",
  backdrop: "oklch(0.15 0.01 45 / 0.42)",

  "border-subtle": "oklch(0.925 0.004 45)",
  border: "oklch(0.885 0.005 45)",
  "border-strong": "oklch(0.62 0.008 45)",

  text: "oklch(0.235 0.012 45)",
  "text-secondary": "oklch(0.42 0.014 45)",
  "text-muted": "oklch(0.51 0.014 45)",
  "text-disabled": "oklch(0.68 0.01 45)",

  accent: "oklch(0.5 0.15 350)",
  "accent-hover": "oklch(0.46 0.15 350)",
  "accent-active": "oklch(0.42 0.14 350)",
  "accent-fg": "oklch(0.995 0.001 350)",
  "accent-subtle": "oklch(0.955 0.022 350)",
  "accent-subtle-fg": "oklch(0.42 0.15 350)",

  success: "oklch(0.5 0.11 155)",
  "success-fg": "oklch(0.99 0.004 155)",
  "success-subtle": "oklch(0.955 0.028 155)",
  "success-subtle-fg": "oklch(0.38 0.09 155)",

  warning: "oklch(0.78 0.14 78)",
  "warning-fg": "oklch(0.24 0.05 78)",
  "warning-subtle": "oklch(0.96 0.045 85)",
  "warning-subtle-fg": "oklch(0.42 0.09 70)",

  danger: "oklch(0.5 0.17 27)",
  "danger-fg": "oklch(0.99 0.004 27)",
  "danger-subtle": "oklch(0.955 0.018 25)",
  "danger-subtle-fg": "oklch(0.42 0.15 27)",

  info: "oklch(0.5 0.1 240)",
  "info-fg": "oklch(0.99 0.004 240)",
  "info-subtle": "oklch(0.95 0.022 240)",
  "info-subtle-fg": "oklch(0.4 0.09 240)",

  selection: "oklch(0.9 0.045 350)",
  "focus-ring": "oklch(0.5 0.15 350)",

  "shadow-1": "0 1px 2px oklch(0.2 0.01 45 / 0.05), 0 1px 3px oklch(0.2 0.01 45 / 0.07)",
  "shadow-2": "0 2px 8px oklch(0.2 0.01 45 / 0.07), 0 12px 32px oklch(0.2 0.01 45 / 0.09)",
};

/** Friendly (default) — dark. */
export const dark: ColorTheme = {
  bg: "oklch(0.17 0.008 45)",
  surface: "oklch(0.205 0.009 45)",
  "surface-raised": "oklch(0.245 0.01 45)",
  overlay: "oklch(0.245 0.01 45)",
  backdrop: "oklch(0.1 0.008 45 / 0.55)",

  "border-subtle": "oklch(0.27 0.01 45)",
  border: "oklch(0.32 0.012 45)",
  "border-strong": "oklch(0.55 0.014 45)",

  text: "oklch(0.93 0.005 45)",
  "text-secondary": "oklch(0.78 0.008 45)",
  "text-muted": "oklch(0.7 0.01 45)",
  "text-disabled": "oklch(0.52 0.01 45)",

  accent: "oklch(0.74 0.12 350)",
  "accent-hover": "oklch(0.78 0.11 350)",
  "accent-active": "oklch(0.7 0.12 350)",
  "accent-fg": "oklch(0.17 0.03 350)",
  "accent-subtle": "oklch(0.27 0.045 350)",
  "accent-subtle-fg": "oklch(0.85 0.08 350)",

  success: "oklch(0.74 0.12 155)",
  "success-fg": "oklch(0.17 0.03 155)",
  "success-subtle": "oklch(0.26 0.035 155)",
  "success-subtle-fg": "oklch(0.84 0.09 155)",

  warning: "oklch(0.8 0.13 80)",
  "warning-fg": "oklch(0.2 0.04 80)",
  "warning-subtle": "oklch(0.27 0.035 80)",
  "warning-subtle-fg": "oklch(0.85 0.09 80)",

  danger: "oklch(0.7 0.15 25)",
  "danger-fg": "oklch(0.16 0.03 25)",
  "danger-subtle": "oklch(0.27 0.04 25)",
  "danger-subtle-fg": "oklch(0.84 0.08 25)",

  info: "oklch(0.74 0.1 240)",
  "info-fg": "oklch(0.17 0.03 240)",
  "info-subtle": "oklch(0.26 0.035 240)",
  "info-subtle-fg": "oklch(0.84 0.07 240)",

  selection: "oklch(0.38 0.075 350)",
  "focus-ring": "oklch(0.74 0.12 350)",

  "shadow-1": "0 1px 2px oklch(0 0 0 / 0.2)",
  "shadow-2": "0 2px 8px oklch(0 0 0 / 0.25), 0 12px 32px oklch(0 0 0 / 0.3)",
};

/**
 * Classic — the original palette (M2–M8), restored via `[data-style="classic"]`.
 * Only the fields whose hue actually differs from friendly are listed; every
 * semantic color (success/warning/danger/info) is identical in both styles.
 */
export const classicLight: Partial<ColorTheme> = {
  bg: "oklch(0.977 0.003 265)",
  surface: "oklch(0.995 0.001 265)",
  backdrop: "oklch(0.15 0.01 265 / 0.42)",

  "border-subtle": "oklch(0.925 0.004 265)",
  border: "oklch(0.885 0.005 265)",
  "border-strong": "oklch(0.62 0.008 265)",

  text: "oklch(0.235 0.012 265)",
  "text-secondary": "oklch(0.42 0.014 265)",
  "text-muted": "oklch(0.51 0.014 265)",
  "text-disabled": "oklch(0.68 0.01 265)",

  accent: "oklch(0.5 0.15 285)",
  "accent-hover": "oklch(0.46 0.15 285)",
  "accent-active": "oklch(0.42 0.14 285)",
  "accent-fg": "oklch(0.995 0.001 285)",
  "accent-subtle": "oklch(0.955 0.022 285)",
  "accent-subtle-fg": "oklch(0.42 0.15 285)",

  selection: "oklch(0.9 0.045 285)",
  "focus-ring": "oklch(0.5 0.15 285)",

  "shadow-1": "0 1px 2px oklch(0.2 0.01 265 / 0.05), 0 1px 3px oklch(0.2 0.01 265 / 0.07)",
  "shadow-2": "0 2px 8px oklch(0.2 0.01 265 / 0.07), 0 12px 32px oklch(0.2 0.01 265 / 0.09)",
};

export const classicDark: Partial<ColorTheme> = {
  bg: "oklch(0.17 0.008 265)",
  surface: "oklch(0.205 0.009 265)",
  "surface-raised": "oklch(0.245 0.01 265)",
  overlay: "oklch(0.245 0.01 265)",
  backdrop: "oklch(0.1 0.008 265 / 0.55)",

  "border-subtle": "oklch(0.27 0.01 265)",
  border: "oklch(0.32 0.012 265)",
  "border-strong": "oklch(0.55 0.014 265)",

  text: "oklch(0.93 0.005 265)",
  "text-secondary": "oklch(0.78 0.008 265)",
  "text-muted": "oklch(0.7 0.01 265)",
  "text-disabled": "oklch(0.52 0.01 265)",

  accent: "oklch(0.74 0.12 285)",
  "accent-hover": "oklch(0.78 0.11 285)",
  "accent-active": "oklch(0.7 0.12 285)",
  "accent-fg": "oklch(0.17 0.03 285)",
  "accent-subtle": "oklch(0.27 0.045 285)",
  "accent-subtle-fg": "oklch(0.85 0.08 285)",

  selection: "oklch(0.38 0.075 285)",
  "focus-ring": "oklch(0.74 0.12 285)",
};

/**
 * High-contrast overrides, applied on top of a theme via [data-contrast="high"].
 * Targets: AAA (7:1) for all text roles, hard borders, no translucency.
 * `highContrast` matches the friendly (default) hue; `classicHighContrast`
 * matches classic — layered in via `[data-style="classic"][data-contrast="high"]`,
 * which outranks the friendly rule on specificity alone.
 */
export const highContrast: Record<ThemeName, Partial<ColorTheme>> = {
  light: {
    "border-subtle": "oklch(0.62 0.008 45)",
    border: "oklch(0.5 0.01 45)",
    "border-strong": "oklch(0.32 0.012 45)",
    text: "oklch(0.145 0.012 45)",
    "text-secondary": "oklch(0.28 0.014 45)",
    "text-muted": "oklch(0.33 0.014 45)",
    "text-disabled": "oklch(0.45 0.01 45)",
    accent: "oklch(0.42 0.15 350)",
    "accent-hover": "oklch(0.38 0.14 350)",
    "accent-active": "oklch(0.35 0.13 350)",
    "accent-subtle-fg": "oklch(0.33 0.14 350)",
    "success-subtle-fg": "oklch(0.3 0.08 155)",
    "warning-subtle-fg": "oklch(0.32 0.08 70)",
    "danger-subtle-fg": "oklch(0.33 0.14 27)",
    "info-subtle-fg": "oklch(0.31 0.08 240)",
    backdrop: "oklch(0.12 0.01 45 / 0.7)",
    "focus-ring": "oklch(0.3 0.14 350)",
  },
  dark: {
    "border-subtle": "oklch(0.45 0.012 45)",
    border: "oklch(0.55 0.014 45)",
    "border-strong": "oklch(0.75 0.012 45)",
    text: "oklch(0.97 0.003 45)",
    "text-secondary": "oklch(0.88 0.006 45)",
    "text-muted": "oklch(0.83 0.008 45)",
    "text-disabled": "oklch(0.62 0.01 45)",
    accent: "oklch(0.8 0.11 350)",
    "accent-hover": "oklch(0.84 0.1 350)",
    "accent-active": "oklch(0.76 0.11 350)",
    "accent-fg": "oklch(0.13 0.03 350)",
    "accent-subtle-fg": "oklch(0.92 0.06 350)",
    "success-subtle-fg": "oklch(0.91 0.07 155)",
    "warning-subtle-fg": "oklch(0.92 0.07 80)",
    "danger-subtle-fg": "oklch(0.91 0.06 25)",
    "info-subtle-fg": "oklch(0.91 0.05 240)",
    backdrop: "oklch(0.05 0.005 45 / 0.8)",
    "focus-ring": "oklch(0.85 0.1 350)",
  },
};

/** High-contrast overrides for the classic style — identical since M2. */
export const classicHighContrast: Record<ThemeName, Partial<ColorTheme>> = {
  light: {
    "border-subtle": "oklch(0.62 0.008 265)",
    border: "oklch(0.5 0.01 265)",
    "border-strong": "oklch(0.32 0.012 265)",
    text: "oklch(0.145 0.012 265)",
    "text-secondary": "oklch(0.28 0.014 265)",
    "text-muted": "oklch(0.33 0.014 265)",
    "text-disabled": "oklch(0.45 0.01 265)",
    accent: "oklch(0.42 0.15 285)",
    "accent-hover": "oklch(0.38 0.14 285)",
    "accent-active": "oklch(0.35 0.13 285)",
    "accent-subtle-fg": "oklch(0.33 0.14 285)",
    "success-subtle-fg": "oklch(0.3 0.08 155)",
    "warning-subtle-fg": "oklch(0.32 0.08 70)",
    "danger-subtle-fg": "oklch(0.33 0.14 27)",
    "info-subtle-fg": "oklch(0.31 0.08 240)",
    backdrop: "oklch(0.12 0.01 265 / 0.7)",
    "focus-ring": "oklch(0.3 0.14 285)",
  },
  dark: {
    "border-subtle": "oklch(0.45 0.012 265)",
    border: "oklch(0.55 0.014 265)",
    "border-strong": "oklch(0.75 0.012 265)",
    text: "oklch(0.97 0.003 265)",
    "text-secondary": "oklch(0.88 0.006 265)",
    "text-muted": "oklch(0.83 0.008 265)",
    "text-disabled": "oklch(0.62 0.01 265)",
    accent: "oklch(0.8 0.11 285)",
    "accent-hover": "oklch(0.84 0.1 285)",
    "accent-active": "oklch(0.76 0.11 285)",
    "accent-fg": "oklch(0.13 0.03 285)",
    "accent-subtle-fg": "oklch(0.92 0.06 285)",
    "success-subtle-fg": "oklch(0.91 0.07 155)",
    "warning-subtle-fg": "oklch(0.92 0.07 80)",
    "danger-subtle-fg": "oklch(0.91 0.06 25)",
    "info-subtle-fg": "oklch(0.91 0.05 240)",
    backdrop: "oklch(0.05 0.005 265 / 0.8)",
    "focus-ring": "oklch(0.85 0.1 285)",
  },
};

/** Non-color tokens shared by both styles (type scale, motion, z, blur). */
export const staticTokens = {
  font: {
    sans: `"Inter Variable", "Noto Sans Hebrew Variable", system-ui, "Segoe UI", sans-serif`,
    mono: `"JetBrains Mono Variable", ui-monospace, "SF Mono", monospace`,
  },
  // 12/13/14(base)/16/18/22/28/36 — docs/architecture/05-design-system.md §2
  text: {
    xs: { size: "0.75rem", leading: "1.35" },
    sm: { size: "0.8125rem", leading: "1.45" },
    base: { size: "0.875rem", leading: "1.55" },
    lg: { size: "1rem", leading: "1.55" },
    xl: { size: "1.125rem", leading: "1.5" },
    "2xl": { size: "1.375rem", leading: "1.35" },
    "3xl": { size: "1.75rem", leading: "1.25" },
    "4xl": { size: "2.25rem", leading: "1.15" },
    display: { size: "clamp(2.25rem, 1.6rem + 2.6vw, 3.25rem)", leading: "1.08" },
  },
  // Friendly (default) — softer, rounder corners than classic.
  radius: {
    xs: "0.3125rem",
    sm: "0.5rem", // controls
    md: "0.625rem",
    lg: "0.875rem", // cards
    xl: "1rem",
    "2xl": "1.25rem", // modals, sheets
  },
  motion: {
    fast: "120ms",
    base: "160ms",
    slow: "240ms",
    "ease-out": "cubic-bezier(0.2, 0, 0, 1)",
    "ease-spring": "cubic-bezier(0.3, 1.25, 0.4, 1)",
  },
  z: {
    sticky: "30",
    dropdown: "50",
    overlay: "80",
    modal: "90",
    toast: "100",
    tooltip: "110",
  },
  blur: {
    backdrop: "12px",
  },
  // Friendly (default) — a thicker, more obvious focus ring.
  focusRingWidth: "3px",
} as const;

/** Classic overrides for the non-color, per-style tokens above. */
export const classicStaticTokens = {
  radius: {
    xs: "0.25rem",
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.625rem",
    xl: "0.75rem",
    "2xl": "1rem",
  },
  focusRingWidth: "2px",
} as const;

/**
 * Contrast requirements, enforced by contrast.test.ts for every
 * theme × contrast-mode combination. [foreground, background, minimum].
 * Normal mode: WCAG AA. High contrast raises text roles to AAA.
 */
export const contrastRequirements: ReadonlyArray<
  readonly [fg: ColorTokenName, bg: ColorTokenName, aa: number, hc: number]
> = [
  ["text", "bg", 4.5, 7],
  ["text", "surface", 4.5, 7],
  ["text", "surface-raised", 4.5, 7],
  ["text-secondary", "bg", 4.5, 7],
  ["text-secondary", "surface", 4.5, 7],
  ["text-muted", "bg", 4.5, 7],
  ["text-muted", "surface", 4.5, 7],
  ["text", "selection", 4.5, 4.5],
  ["accent-fg", "accent", 4.5, 4.5],
  ["accent-fg", "accent-hover", 4.5, 4.5],
  ["accent-fg", "accent-active", 4.5, 4.5],
  ["accent-subtle-fg", "accent-subtle", 4.5, 7],
  ["success-fg", "success", 4.5, 4.5],
  ["success-subtle-fg", "success-subtle", 4.5, 7],
  ["warning-fg", "warning", 4.5, 4.5],
  ["warning-subtle-fg", "warning-subtle", 4.5, 7],
  ["danger-fg", "danger", 4.5, 4.5],
  ["danger-subtle-fg", "danger-subtle", 4.5, 7],
  ["info-fg", "info", 4.5, 4.5],
  ["info-subtle-fg", "info-subtle", 4.5, 7],
  // WCAG 1.4.11 non-text contrast for interactive affordances
  ["border-strong", "bg", 3, 4.5],
  ["focus-ring", "bg", 3, 4.5],
  ["focus-ring", "surface", 3, 4.5],
  ["accent", "bg", 3, 4.5],
];
