import { describe, expect, it } from "vitest";
import { type Color, oklch, wcagContrast } from "culori";
import {
  type ColorTheme,
  type StyleName,
  type ThemeName,
  classicDark,
  classicHighContrast,
  classicLight,
  contrastRequirements,
  dark,
  highContrast,
  light,
} from "./tokens.ts";

/**
 * The palette gate: no color change ships unless every declared pairing
 * meets WCAG AA — and AAA where high-contrast mode promises it. Runs for
 * every style × theme × contrast-mode combination, so a new style (or a
 * change to an existing one) is refused unless it clears the same bar.
 * (docs/architecture/05-design-system.md §2: "verified by a token test,
 * not by eyeballing")
 */

const styles: Record<
  StyleName,
  { themes: Record<ThemeName, ColorTheme>; highContrast: Record<ThemeName, Partial<ColorTheme>> }
> = {
  friendly: { themes: { light, dark }, highContrast },
  classic: {
    themes: {
      light: { ...light, ...classicLight },
      dark: { ...dark, ...classicDark },
    },
    highContrast: classicHighContrast,
  },
};

function parse(value: string, name: string): Color {
  const parsed = oklch(value);
  if (!parsed) throw new Error(`Token "${name}" is not parseable color: ${value}`);
  return parsed;
}

function opaque(color: Color): Color {
  return { ...color, alpha: 1 };
}

describe.each(Object.keys(styles) as StyleName[])("%s style", (styleName) => {
  const { themes, highContrast: hc } = styles[styleName];

  describe.each(Object.keys(themes) as ThemeName[])("%s theme", (themeName) => {
    const base = themes[themeName];
    const hcTheme: ColorTheme = { ...base, ...hc[themeName] };

    describe.each([["normal", base, 2] as const, ["high-contrast", hcTheme, 3] as const])(
      "%s mode",
      (_mode, theme, requirementIndex) => {
        it.each(contrastRequirements.map((r) => [r[0], r[1], r[requirementIndex]] as const))(
          "%s on %s ≥ %s:1",
          (fgName, bgName, minimum) => {
            const fg = opaque(parse(theme[fgName], fgName));
            const bg = opaque(parse(theme[bgName], bgName));
            const ratio = wcagContrast(fg, bg);
            expect(
              ratio,
              `${fgName} (${theme[fgName]}) on ${bgName} (${theme[bgName]}) = ${ratio.toFixed(2)}:1, needs ${minimum}:1`,
            ).toBeGreaterThanOrEqual(minimum);
          },
        );
      },
    );
  });
});

describe("token hygiene", () => {
  it("dark theme defines exactly the same tokens as light", () => {
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
  });

  it("high-contrast overrides only reference existing tokens", () => {
    const known = new Set(Object.keys(light));
    for (const mode of [
      ...Object.values(highContrast),
      ...Object.values(classicHighContrast),
    ]) {
      for (const key of Object.keys(mode)) {
        expect(known.has(key), `unknown token in highContrast: ${key}`).toBe(true);
      }
    }
  });

  it("classic overrides only reference existing tokens", () => {
    const known = new Set(Object.keys(light));
    for (const key of [...Object.keys(classicLight), ...Object.keys(classicDark)]) {
      expect(known.has(key), `unknown token in classic overrides: ${key}`).toBe(true);
    }
  });

  it("every color token is valid OKLCH (shadows excepted)", () => {
    for (const [themeName, theme] of Object.entries({ light, dark })) {
      for (const [name, value] of Object.entries(theme)) {
        if (name.startsWith("shadow-")) continue;
        expect(oklch(value), `${themeName}.${name} = ${value}`).toBeTruthy();
      }
    }
  });
});
