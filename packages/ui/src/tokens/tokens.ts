/**
 * The Omnio design tokens — single source of truth.
 *
 * Everything here is OKLCH: perceptually uniform, so light/dark stay
 * genuinely matched and new axes are data, not eyeballed art. Compiled to
 * `src/styles/tokens.css` by `scripts/generate-tokens.ts`; `contrast.test.ts`
 * refuses any combination that breaks WCAG AA/AAA
 * (docs/architecture/05-design-system.md §2, §7).
 *
 * Four independent axes, all attribute-driven on <html> — switching never
 * re-renders React:
 * - **Theme**: `light` | `dark` — `[data-theme]`.
 * - **Style**: `classic` | `modern` (default) | `minimal` | `accessible` —
 *   `[data-style]`. Governs neutrals, radii, focus-ring weight, shadow
 *   character — the "shape and calm" of the interface. `modern` needs no
 *   attribute; every other style is one attribute away, always.
 * - **Accent**: `indigo` (default) | `blue` | `purple` | `green` | `orange` —
 *   `[data-accent]`. The one brand color, independent of style — a Minimal
 *   install can still be Orange-accented, an Accessible one can be Green.
 * - **Contrast**: `normal` | `high` — `[data-contrast]`. Layers AAA overrides
 *   on top of any style × accent × theme combination.
 *
 * Identity notes:
 * - **Classic**: cool violet neutrals (hue 265), tight radii, 2px focus ring
 *   — the original M2 palette, byte-for-byte unchanged, always restorable.
 * - **Modern** (default): warm amber neutrals (hue 45), rounder radii, 3px
 *   focus ring — friendlier corners, more obvious interaction states.
 * - **Minimal**: near-true-neutral grayscale (chroma ≈0), the tightest radii
 *   of any style, flat single-level shadows — quiet, architectural.
 * - **Accessible**: the old high-contrast numbers *as the default*, not an
 *   overlay — AAA text contrast, bold borders everywhere, a 4px focus ring.
 *   Combining it with `[data-contrast="high"]` pushes further still.
 * - Accent hues are chosen to stay clear of every semantic hue (danger 27,
 *   warning 78, success 155, info 240) wherever practical, so a primary
 *   action is never mistaken for an alert.
 * - Semantic colors (success/warning/danger/info) never shift with style or
 *   accent — meaning must stay stable regardless of visual identity.
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
export type StyleName = "classic" | "modern" | "minimal" | "accessible";
export type AccentName = "indigo" | "blue" | "purple" | "green" | "orange";
export type ColorTheme = Record<ColorTokenName, string>;

/** Neutral tokens only — everything except accent/semantic/selection/focus-ring. */
type NeutralTheme = Omit<
  ColorTheme,
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
>;

/** Accent tokens only — the slice every accent color and every style share. */
type AccentTokens = Pick<
  ColorTheme,
  | "accent"
  | "accent-hover"
  | "accent-active"
  | "accent-fg"
  | "accent-subtle"
  | "accent-subtle-fg"
  | "selection"
  | "focus-ring"
>;

const ok = (l: number, c: number, h: number, alpha?: number): string =>
  alpha === undefined ? `oklch(${l} ${c} ${h})` : `oklch(${l} ${c} ${h} / ${alpha})`;

/**
 * Every accent color shares this exact L/C progression (proven against the
 * contrast gate) — only the hue changes. This is what makes a new accent
 * color a one-line addition instead of a hand-tuned palette.
 */
function accentTokens(hue: number, theme: ThemeName): AccentTokens {
  if (theme === "light") {
    return {
      accent: ok(0.5, 0.15, hue),
      "accent-hover": ok(0.46, 0.15, hue),
      "accent-active": ok(0.42, 0.14, hue),
      "accent-fg": ok(0.995, 0.001, hue),
      "accent-subtle": ok(0.955, 0.022, hue),
      "accent-subtle-fg": ok(0.42, 0.15, hue),
      selection: ok(0.9, 0.045, hue),
      "focus-ring": ok(0.5, 0.15, hue),
    };
  }
  return {
    accent: ok(0.74, 0.12, hue),
    "accent-hover": ok(0.78, 0.11, hue),
    "accent-active": ok(0.7, 0.12, hue),
    "accent-fg": ok(0.17, 0.03, hue),
    "accent-subtle": ok(0.27, 0.045, hue),
    "accent-subtle-fg": ok(0.85, 0.08, hue),
    selection: ok(0.38, 0.075, hue),
    "focus-ring": ok(0.74, 0.12, hue),
  };
}

/** High-contrast (AAA) tuning for an accent hue — same shape as accentTokens. */
function accentHighContrast(hue: number, theme: ThemeName): Partial<AccentTokens> {
  if (theme === "light") {
    return {
      accent: ok(0.42, 0.15, hue),
      "accent-hover": ok(0.38, 0.14, hue),
      "accent-active": ok(0.35, 0.13, hue),
      "accent-subtle-fg": ok(0.33, 0.14, hue),
      "focus-ring": ok(0.3, 0.14, hue),
    };
  }
  return {
    accent: ok(0.8, 0.11, hue),
    "accent-hover": ok(0.84, 0.1, hue),
    "accent-active": ok(0.76, 0.11, hue),
    "accent-fg": ok(0.13, 0.03, hue),
    "accent-subtle-fg": ok(0.92, 0.06, hue),
    "focus-ring": ok(0.85, 0.1, hue),
  };
}

/** Hue per accent color. Chosen to stay clear of the semantic hues where practical. */
export const ACCENT_HUES: Record<AccentName, number> = {
  indigo: 275,
  blue: 255,
  purple: 300,
  green: 165,
  orange: 55,
};

export const accentPalette: Record<AccentName, Record<ThemeName, AccentTokens>> = Object.fromEntries(
  (Object.keys(ACCENT_HUES) as AccentName[]).map((name) => [
    name,
    { light: accentTokens(ACCENT_HUES[name], "light"), dark: accentTokens(ACCENT_HUES[name], "dark") },
  ]),
) as Record<AccentName, Record<ThemeName, AccentTokens>>;

export const accentHighContrastPalette: Record<
  AccentName,
  Record<ThemeName, Partial<AccentTokens>>
> = Object.fromEntries(
  (Object.keys(ACCENT_HUES) as AccentName[]).map((name) => [
    name,
    {
      light: accentHighContrast(ACCENT_HUES[name], "light"),
      dark: accentHighContrast(ACCENT_HUES[name], "dark"),
    },
  ]),
) as Record<AccentName, Record<ThemeName, Partial<AccentTokens>>>;

/** Semantic colors — identical across every style and accent. */
function semanticTokens(theme: ThemeName): Omit<ColorTheme, keyof NeutralTheme | keyof AccentTokens> {
  return theme === "light"
    ? {
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
      }
    : {
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
      };
}

/** Classic — the original palette (M2–M8), byte-for-byte unchanged. */
const classicNeutrals: Record<ThemeName, NeutralTheme> = {
  light: {
    bg: ok(0.977, 0.003, 265),
    surface: ok(0.995, 0.001, 265),
    "surface-raised": "oklch(1 0 0)",
    overlay: "oklch(1 0 0)",
    backdrop: ok(0.15, 0.01, 265, 0.42),
    "border-subtle": ok(0.925, 0.004, 265),
    border: ok(0.885, 0.005, 265),
    "border-strong": ok(0.62, 0.008, 265),
    text: ok(0.235, 0.012, 265),
    "text-secondary": ok(0.42, 0.014, 265),
    "text-muted": ok(0.51, 0.014, 265),
    "text-disabled": ok(0.68, 0.01, 265),
    "shadow-1": `0 1px 2px ${ok(0.2, 0.01, 265, 0.05)}, 0 1px 3px ${ok(0.2, 0.01, 265, 0.07)}`,
    "shadow-2": `0 2px 8px ${ok(0.2, 0.01, 265, 0.07)}, 0 12px 32px ${ok(0.2, 0.01, 265, 0.09)}`,
  },
  dark: {
    bg: ok(0.17, 0.008, 265),
    surface: ok(0.205, 0.009, 265),
    "surface-raised": ok(0.245, 0.01, 265),
    overlay: ok(0.245, 0.01, 265),
    backdrop: ok(0.1, 0.008, 265, 0.55),
    "border-subtle": ok(0.27, 0.01, 265),
    border: ok(0.32, 0.012, 265),
    "border-strong": ok(0.55, 0.014, 265),
    text: ok(0.93, 0.005, 265),
    "text-secondary": ok(0.78, 0.008, 265),
    "text-muted": ok(0.7, 0.01, 265),
    "text-disabled": ok(0.52, 0.01, 265),
    "shadow-1": "0 1px 2px oklch(0 0 0 / 0.2)",
    "shadow-2": "0 2px 8px oklch(0 0 0 / 0.25), 0 12px 32px oklch(0 0 0 / 0.3)",
  },
};

/** Modern (default) — warm amber neutrals, rounder, more obvious focus. */
const modernNeutrals: Record<ThemeName, NeutralTheme> = {
  light: {
    bg: ok(0.977, 0.003, 45),
    surface: ok(0.995, 0.001, 45),
    "surface-raised": "oklch(1 0 0)",
    overlay: "oklch(1 0 0)",
    backdrop: ok(0.15, 0.01, 45, 0.42),
    "border-subtle": ok(0.925, 0.004, 45),
    border: ok(0.885, 0.005, 45),
    "border-strong": ok(0.62, 0.008, 45),
    text: ok(0.235, 0.012, 45),
    "text-secondary": ok(0.42, 0.014, 45),
    "text-muted": ok(0.51, 0.014, 45),
    "text-disabled": ok(0.68, 0.01, 45),
    "shadow-1": `0 1px 2px ${ok(0.2, 0.01, 45, 0.05)}, 0 1px 3px ${ok(0.2, 0.01, 45, 0.07)}`,
    "shadow-2": `0 2px 8px ${ok(0.2, 0.01, 45, 0.07)}, 0 12px 32px ${ok(0.2, 0.01, 45, 0.09)}`,
  },
  dark: {
    bg: ok(0.17, 0.008, 45),
    surface: ok(0.205, 0.009, 45),
    "surface-raised": ok(0.245, 0.01, 45),
    overlay: ok(0.245, 0.01, 45),
    backdrop: ok(0.1, 0.008, 45, 0.55),
    "border-subtle": ok(0.27, 0.01, 45),
    border: ok(0.32, 0.012, 45),
    "border-strong": ok(0.55, 0.014, 45),
    text: ok(0.93, 0.005, 45),
    "text-secondary": ok(0.78, 0.008, 45),
    "text-muted": ok(0.7, 0.01, 45),
    "text-disabled": ok(0.52, 0.01, 45),
    "shadow-1": "0 1px 2px oklch(0 0 0 / 0.2)",
    "shadow-2": "0 2px 8px oklch(0 0 0 / 0.25), 0 12px 32px oklch(0 0 0 / 0.3)",
  },
};

/** Minimal — near-true grayscale, flat single-level shadow, tightest radii. */
const minimalNeutrals: Record<ThemeName, NeutralTheme> = {
  light: {
    bg: ok(0.978, 0.001, 265),
    surface: ok(0.996, 0.0005, 265),
    "surface-raised": "oklch(1 0 0)",
    overlay: "oklch(1 0 0)",
    backdrop: ok(0.15, 0.002, 265, 0.4),
    "border-subtle": ok(0.93, 0.001, 265),
    border: ok(0.88, 0.0015, 265),
    "border-strong": ok(0.6, 0.002, 265),
    text: ok(0.22, 0.002, 265),
    "text-secondary": ok(0.4, 0.002, 265),
    "text-muted": ok(0.5, 0.002, 265),
    "text-disabled": ok(0.7, 0.002, 265),
    "shadow-1": `0 1px 2px ${ok(0.2, 0, 0, 0.04)}`,
    "shadow-2": `0 1px 2px ${ok(0.2, 0, 0, 0.04)}, 0 4px 12px ${ok(0.2, 0, 0, 0.05)}`,
  },
  dark: {
    bg: ok(0.16, 0.002, 265),
    surface: ok(0.2, 0.002, 265),
    "surface-raised": ok(0.24, 0.002, 265),
    overlay: ok(0.24, 0.002, 265),
    backdrop: ok(0.09, 0.002, 265, 0.55),
    "border-subtle": ok(0.26, 0.002, 265),
    border: ok(0.31, 0.002, 265),
    "border-strong": ok(0.54, 0.002, 265),
    text: ok(0.94, 0.001, 265),
    "text-secondary": ok(0.79, 0.002, 265),
    "text-muted": ok(0.71, 0.002, 265),
    "text-disabled": ok(0.53, 0.002, 265),
    "shadow-1": "0 1px 2px oklch(0 0 0 / 0.15)",
    "shadow-2": "0 1px 2px oklch(0 0 0 / 0.15), 0 4px 12px oklch(0 0 0 / 0.18)",
  },
};

/**
 * Accessible — the old high-contrast numbers *as the default*: AAA text
 * contrast and bold borders without needing the contrast toggle at all.
 */
const accessibleNeutrals: Record<ThemeName, NeutralTheme> = {
  light: {
    bg: ok(0.977, 0.003, 265),
    surface: ok(0.995, 0.001, 265),
    "surface-raised": "oklch(1 0 0)",
    overlay: "oklch(1 0 0)",
    backdrop: ok(0.12, 0.01, 265, 0.75),
    "border-subtle": ok(0.62, 0.008, 265),
    border: ok(0.5, 0.01, 265),
    "border-strong": ok(0.32, 0.012, 265),
    text: ok(0.145, 0.012, 265),
    "text-secondary": ok(0.28, 0.014, 265),
    "text-muted": ok(0.33, 0.014, 265),
    "text-disabled": ok(0.45, 0.01, 265),
    "shadow-1": `0 1px 2px ${ok(0.2, 0.01, 265, 0.08)}, 0 1px 3px ${ok(0.2, 0.01, 265, 0.1)}`,
    "shadow-2": `0 2px 8px ${ok(0.2, 0.01, 265, 0.1)}, 0 12px 32px ${ok(0.2, 0.01, 265, 0.12)}`,
  },
  dark: {
    bg: ok(0.14, 0.008, 265),
    surface: ok(0.18, 0.009, 265),
    "surface-raised": ok(0.22, 0.01, 265),
    overlay: ok(0.22, 0.01, 265),
    backdrop: ok(0.05, 0.005, 265, 0.85),
    "border-subtle": ok(0.45, 0.012, 265),
    border: ok(0.55, 0.014, 265),
    "border-strong": ok(0.75, 0.012, 265),
    text: ok(0.97, 0.003, 265),
    "text-secondary": ok(0.88, 0.006, 265),
    "text-muted": ok(0.83, 0.008, 265),
    "text-disabled": ok(0.62, 0.01, 265),
    "shadow-1": "0 1px 2px oklch(0 0 0 / 0.3)",
    "shadow-2": "0 2px 8px oklch(0 0 0 / 0.35), 0 12px 32px oklch(0 0 0 / 0.4)",
  },
};

export const styleNeutrals: Record<StyleName, Record<ThemeName, NeutralTheme>> = {
  classic: classicNeutrals,
  modern: modernNeutrals,
  minimal: minimalNeutrals,
  accessible: accessibleNeutrals,
};

/** Default accent hue per style, used only to assemble the full `light`/`dark`
 * exports below for tooling/tests that want one concrete theme. The running
 * app always layers the user's chosen `[data-accent]` on top regardless. */
const DEFAULT_ACCENT: AccentName = "indigo";

function assemble(style: StyleName, theme: ThemeName): ColorTheme {
  return {
    ...styleNeutrals[style][theme],
    ...accentPalette[DEFAULT_ACCENT][theme],
    ...semanticTokens(theme),
  } as ColorTheme;
}

/** Modern (default style) + Indigo (default accent) — the concrete default theme. */
export const light: ColorTheme = assemble("modern", "light");
export const dark: ColorTheme = assemble("modern", "dark");

/** Classic style's full theme, default accent — used by legacy call sites and tests. */
export const classicLight: ColorTheme = assemble("classic", "light");
export const classicDark: ColorTheme = assemble("classic", "dark");

/**
 * High-contrast (AAA) overrides, per style, layered via
 * `[data-contrast="high"]` (and `[data-style="…"][data-contrast="high"]` for
 * non-default styles). Neutrals are hand-tuned per style below; the accent
 * slice reuses `accentHighContrastPalette` for whichever color is active.
 */
type NeutralHighContrast = Partial<NeutralTheme>;

const highContrastNeutralsByStyle: Record<StyleName, Record<ThemeName, NeutralHighContrast>> = {
  classic: {
    light: {
      "border-subtle": ok(0.62, 0.008, 265),
      border: ok(0.5, 0.01, 265),
      "border-strong": ok(0.32, 0.012, 265),
      text: ok(0.145, 0.012, 265),
      "text-secondary": ok(0.28, 0.014, 265),
      "text-muted": ok(0.33, 0.014, 265),
      "text-disabled": ok(0.45, 0.01, 265),
      backdrop: ok(0.12, 0.01, 265, 0.7),
    },
    dark: {
      "border-subtle": ok(0.45, 0.012, 265),
      border: ok(0.55, 0.014, 265),
      "border-strong": ok(0.75, 0.012, 265),
      text: ok(0.97, 0.003, 265),
      "text-secondary": ok(0.88, 0.006, 265),
      "text-muted": ok(0.83, 0.008, 265),
      "text-disabled": ok(0.62, 0.01, 265),
      backdrop: ok(0.05, 0.005, 265, 0.8),
    },
  },
  modern: {
    light: {
      "border-subtle": ok(0.62, 0.008, 45),
      border: ok(0.5, 0.01, 45),
      "border-strong": ok(0.32, 0.012, 45),
      text: ok(0.145, 0.012, 45),
      "text-secondary": ok(0.28, 0.014, 45),
      "text-muted": ok(0.33, 0.014, 45),
      "text-disabled": ok(0.45, 0.01, 45),
      backdrop: ok(0.12, 0.01, 45, 0.7),
    },
    dark: {
      "border-subtle": ok(0.45, 0.012, 45),
      border: ok(0.55, 0.014, 45),
      "border-strong": ok(0.75, 0.012, 45),
      text: ok(0.97, 0.003, 45),
      "text-secondary": ok(0.88, 0.006, 45),
      "text-muted": ok(0.83, 0.008, 45),
      "text-disabled": ok(0.62, 0.01, 45),
      backdrop: ok(0.05, 0.005, 45, 0.8),
    },
  },
  minimal: {
    light: {
      "border-subtle": ok(0.6, 0.002, 265),
      border: ok(0.48, 0.002, 265),
      "border-strong": ok(0.3, 0.002, 265),
      text: ok(0.13, 0.002, 265),
      "text-secondary": ok(0.26, 0.002, 265),
      "text-muted": ok(0.31, 0.002, 265),
      "text-disabled": ok(0.44, 0.002, 265),
      backdrop: ok(0.12, 0.002, 265, 0.7),
    },
    dark: {
      "border-subtle": ok(0.46, 0.002, 265),
      border: ok(0.56, 0.002, 265),
      "border-strong": ok(0.77, 0.002, 265),
      text: ok(0.98, 0.001, 265),
      "text-secondary": ok(0.89, 0.002, 265),
      "text-muted": ok(0.84, 0.002, 265),
      "text-disabled": ok(0.63, 0.002, 265),
      backdrop: ok(0.04, 0.002, 265, 0.82),
    },
  },
  // Accessible's *default* already sits at AAA; the high-contrast toggle
  // pushes to near-absolute extremes on top of it.
  accessible: {
    light: {
      "border-subtle": ok(0.5, 0.01, 265),
      border: ok(0.35, 0.012, 265),
      "border-strong": ok(0.18, 0.014, 265),
      text: ok(0.05, 0.008, 265),
      "text-secondary": ok(0.16, 0.012, 265),
      "text-muted": ok(0.22, 0.012, 265),
      "text-disabled": ok(0.38, 0.01, 265),
      backdrop: ok(0.08, 0.01, 265, 0.85),
    },
    dark: {
      "border-subtle": ok(0.55, 0.014, 265),
      border: ok(0.68, 0.014, 265),
      "border-strong": ok(0.85, 0.012, 265),
      text: ok(0.99, 0.002, 265),
      "text-secondary": ok(0.93, 0.004, 265),
      "text-muted": ok(0.89, 0.006, 265),
      "text-disabled": ok(0.7, 0.01, 265),
      backdrop: ok(0.03, 0.004, 265, 0.9),
    },
  },
};

/** Full assembled high-contrast partials (neutrals + default-accent tuning), per style. */
export const highContrast: Record<ThemeName, Partial<ColorTheme>> = {
  light: { ...highContrastNeutralsByStyle.modern.light, ...accentHighContrastPalette[DEFAULT_ACCENT].light },
  dark: { ...highContrastNeutralsByStyle.modern.dark, ...accentHighContrastPalette[DEFAULT_ACCENT].dark },
};
export const classicHighContrast: Record<ThemeName, Partial<ColorTheme>> = {
  light: { ...highContrastNeutralsByStyle.classic.light, ...accentHighContrastPalette[DEFAULT_ACCENT].light },
  dark: { ...highContrastNeutralsByStyle.classic.dark, ...accentHighContrastPalette[DEFAULT_ACCENT].dark },
};

export { highContrastNeutralsByStyle };

/** Non-color, per-style tokens: radius and focus-ring weight. */
interface StyleShape {
  radius: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    "2xl": string;
  };
  focusRingWidth: string;
}

export const styleShape: Record<StyleName, StyleShape> = {
  classic: {
    radius: { xs: "0.25rem", sm: "0.375rem", md: "0.5rem", lg: "0.625rem", xl: "0.75rem", "2xl": "1rem" },
    focusRingWidth: "2px",
  },
  modern: {
    radius: { xs: "0.3125rem", sm: "0.5rem", md: "0.625rem", lg: "0.875rem", xl: "1rem", "2xl": "1.25rem" },
    focusRingWidth: "3px",
  },
  minimal: {
    radius: { xs: "0.1875rem", sm: "0.25rem", md: "0.3125rem", lg: "0.375rem", xl: "0.5rem", "2xl": "0.625rem" },
    focusRingWidth: "2px",
  },
  accessible: {
    radius: { xs: "0.25rem", sm: "0.4375rem", md: "0.5625rem", lg: "0.75rem", xl: "0.875rem", "2xl": "1.125rem" },
    focusRingWidth: "4px",
  },
};

/** Legacy aliases some call sites still reference. */
export const classicStaticTokens = { radius: styleShape.classic.radius, focusRingWidth: styleShape.classic.focusRingWidth } as const;

/** Non-color tokens identical across every style (type scale, motion, z, blur). */
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
  radius: styleShape.modern.radius,
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
  focusRingWidth: styleShape.modern.focusRingWidth,
} as const;

/**
 * Density: three levels of control sizing (compact/comfortable/large),
 * independent of style — a Minimal install can still be run Large for touch.
 * `[data-density]`; `comfortable` is the default and needs no attribute.
 */
export type DensityName = "compact" | "comfortable" | "large";

export interface DensityScale {
  controlHeightSm: string;
  controlHeightMd: string;
  controlHeightLg: string;
  controlPadX: string;
  gap: string;
}

export const densityScale: Record<DensityName, DensityScale> = {
  compact: {
    controlHeightSm: "1.5rem",
    controlHeightMd: "1.75rem",
    controlHeightLg: "2.25rem",
    controlPadX: "0.5rem",
    gap: "0.375rem",
  },
  comfortable: {
    controlHeightSm: "1.75rem",
    controlHeightMd: "2rem",
    controlHeightLg: "2.5rem",
    controlPadX: "0.75rem",
    gap: "0.5rem",
  },
  large: {
    controlHeightSm: "2rem",
    controlHeightMd: "2.5rem",
    controlHeightLg: "3rem",
    controlPadX: "1rem",
    gap: "0.75rem",
  },
};

/**
 * Contrast requirements, enforced by contrast.test.ts for every
 * style × accent × theme × contrast-mode combination. [foreground,
 * background, minimum]. Normal mode: WCAG AA. High contrast: AAA.
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
