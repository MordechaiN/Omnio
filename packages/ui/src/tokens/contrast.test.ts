import { describe, expect, it } from "vitest";
import { type Color, oklch, wcagContrast } from "culori";
import {
  type AccentName,
  type ColorTheme,
  type StyleName,
  type ThemeName,
  ACCENT_HUES,
  accentHighContrastPalette,
  accentPalette,
  contrastRequirements,
  dark,
  highContrastNeutralsByStyle,
  light,
  styleNeutrals,
} from "./tokens.ts";

/**
 * The palette gate: no color change ships unless every declared pairing
 * meets WCAG AA — and AAA where high-contrast mode promises it. Runs for
 * every style × accent × theme × contrast-mode combination (neutrals and
 * accent are independent axes, so this is the full cross-product a user can
 * actually reach), so a new style or accent is refused unless it clears the
 * same bar (docs/architecture/05-design-system.md §2, §7).
 */

const STYLES = Object.keys(styleNeutrals) as StyleName[];
const ACCENTS = Object.keys(ACCENT_HUES) as AccentName[];
const THEME_BASE: Record<ThemeName, ColorTheme> = { light, dark };

function assemble(style: StyleName, accent: AccentName, theme: ThemeName): ColorTheme {
  return {
    ...THEME_BASE[theme],
    ...styleNeutrals[style][theme],
    ...accentPalette[accent][theme],
  };
}

function assembleHighContrast(style: StyleName, accent: AccentName, theme: ThemeName): ColorTheme {
  return {
    ...assemble(style, accent, theme),
    ...highContrastNeutralsByStyle[style][theme],
    ...accentHighContrastPalette[accent][theme],
  };
}

function parse(value: string, name: string): Color {
  const parsed = oklch(value);
  if (!parsed) throw new Error(`Token "${name}" is not parseable color: ${value}`);
  return parsed;
}

function opaque(color: Color): Color {
  return { ...color, alpha: 1 };
}

describe.each(STYLES)("%s style", (style) => {
  describe.each(ACCENTS)("%s accent", (accent) => {
    describe.each(Object.keys(THEME_BASE) as ThemeName[])("%s theme", (theme) => {
      const normal = assemble(style, accent, theme);
      const hc = assembleHighContrast(style, accent, theme);

      describe.each([["normal", normal, 2] as const, ["high-contrast", hc, 3] as const])(
        "%s mode",
        (_mode, colors, requirementIndex) => {
          it.each(contrastRequirements.map((r) => [r[0], r[1], r[requirementIndex]] as const))(
            "%s on %s ≥ %s:1",
            (fgName, bgName, minimum) => {
              const fg = opaque(parse(colors[fgName], fgName));
              const bg = opaque(parse(colors[bgName], bgName));
              const ratio = wcagContrast(fg, bg);
              expect(
                ratio,
                `${fgName} (${colors[fgName]}) on ${bgName} (${colors[bgName]}) = ${ratio.toFixed(2)}:1, needs ${minimum}:1`,
              ).toBeGreaterThanOrEqual(minimum);
            },
          );
        },
      );
    });
  });
});

describe("token hygiene", () => {
  it("dark theme defines exactly the same tokens as light", () => {
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
  });

  it("every style defines the same neutral tokens for light and dark", () => {
    for (const style of STYLES) {
      expect(Object.keys(styleNeutrals[style].dark).sort()).toEqual(
        Object.keys(styleNeutrals[style].light).sort(),
      );
    }
  });

  it("every accent defines the same tokens for light and dark", () => {
    for (const accent of ACCENTS) {
      expect(Object.keys(accentPalette[accent].dark).sort()).toEqual(
        Object.keys(accentPalette[accent].light).sort(),
      );
    }
  });

  it("high-contrast overrides only reference existing tokens", () => {
    const known = new Set(Object.keys(light));
    for (const style of STYLES) {
      for (const mode of Object.values(highContrastNeutralsByStyle[style])) {
        for (const key of Object.keys(mode)) {
          expect(known.has(key), `unknown token in ${style} highContrast: ${key}`).toBe(true);
        }
      }
    }
    for (const accent of ACCENTS) {
      for (const mode of Object.values(accentHighContrastPalette[accent])) {
        for (const key of Object.keys(mode)) {
          expect(known.has(key), `unknown token in ${accent} accentHighContrast: ${key}`).toBe(true);
        }
      }
    }
  });

  it("every color token is valid OKLCH (shadows excepted)", () => {
    for (const style of STYLES) {
      for (const accent of ACCENTS) {
        for (const theme of Object.keys(THEME_BASE) as ThemeName[]) {
          const colors = assemble(style, accent, theme);
          for (const [name, value] of Object.entries(colors)) {
            if (name.startsWith("shadow-")) continue;
            expect(oklch(value), `${style}/${accent}/${theme}.${name} = ${value}`).toBeTruthy();
          }
        }
      }
    }
  });
});
