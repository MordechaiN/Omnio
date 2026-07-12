/**
 * The Omnio design tokens — single source of truth.
 *
 * Everything here is OKLCH: perceptually uniform, so light and dark are
 * genuinely matched rather than eyeballed, and future themes are data.
 * `scripts/generate-tokens.ts` compiles this file to `src/styles/tokens.css`;
 * `src/tokens/contrast.test.ts` refuses any palette change that breaks
 * WCAG AA (docs/architecture/05-design-system.md §2).
 *
 * Identity notes:
 * - Neutrals carry a whisper of cool violet (hue ≈265, chroma ≤0.012) —
 *   calm, never dead gray, never blue-corporate.
 * - One accent: muted iris (hue 285). Deliberately not "developer blue".
 *   Used for primary actions, focus, selection — and nothing else.
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
export type ColorTheme = Record<ColorTokenName, string>;

export const light: ColorTheme = {
  bg: "oklch(0.977 0.003 265)",
  surface: "oklch(0.995 0.001 265)",
  "surface-raised": "oklch(1 0 0)",
  overlay: "oklch(1 0 0)",
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

  selection: "oklch(0.9 0.045 285)",
  "focus-ring": "oklch(0.5 0.15 285)",

  "shadow-1": "0 1px 2px oklch(0.2 0.01 265 / 0.05), 0 1px 3px oklch(0.2 0.01 265 / 0.07)",
  "shadow-2": "0 2px 8px oklch(0.2 0.01 265 / 0.07), 0 12px 32px oklch(0.2 0.01 265 / 0.09)",
};

export const dark: ColorTheme = {
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

  selection: "oklch(0.38 0.075 285)",
  "focus-ring": "oklch(0.74 0.12 285)",

  "shadow-1": "0 1px 2px oklch(0 0 0 / 0.2)",
  "shadow-2": "0 2px 8px oklch(0 0 0 / 0.25), 0 12px 32px oklch(0 0 0 / 0.3)",
};

/**
 * High-contrast overrides, applied on top of a theme via [data-contrast="high"].
 * Targets: AAA (7:1) for all text roles, hard borders, no translucency.
 */
export const highContrast: Record<ThemeName, Partial<ColorTheme>> = {
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

/** Non-color tokens — identical across themes. */
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
  radius: {
    xs: "0.25rem",
    sm: "0.375rem", // controls
    md: "0.5rem",
    lg: "0.625rem", // cards
    xl: "0.75rem",
    "2xl": "1rem", // modals, sheets
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
