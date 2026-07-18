import {
  type AccentName,
  type ColorTheme,
  type DensityName,
  type StyleName,
  type ThemeName,
  ACCENT_HUES,
  accentHighContrastPalette,
  accentPalette,
  densityScale,
  highContrastNeutralsByStyle,
  light,
  staticTokens,
  styleNeutrals,
  styleShape,
} from "./tokens.ts";

const STYLES = Object.keys(styleShape) as StyleName[];
const ACCENTS = Object.keys(ACCENT_HUES) as AccentName[];
const DENSITIES = Object.keys(densityScale) as DensityName[];
const THEMES: ThemeName[] = ["light", "dark"];

const DEFAULT_STYLE: StyleName = "modern";
const DEFAULT_ACCENT: AccentName = "indigo";
const DEFAULT_DENSITY: DensityName = "comfortable";

function colorBlock(theme: Record<string, string> | Partial<Record<string, string>>): string {
  return Object.entries(theme)
    .map(([name, value]) => `  --${name}: ${value};`)
    .join("\n");
}

function shapeBlock(style: StyleName): string {
  const shape = styleShape[style];
  const lines: string[] = [];
  for (const [k, v] of Object.entries(shape.radius)) lines.push(`  --radius-${k}: ${v};`);
  lines.push(`  --focus-ring-width: ${shape.focusRingWidth};`);
  return lines.join("\n");
}

function densityBlock(density: DensityName): string {
  const d = densityScale[density];
  return [
    `  --control-h-sm: ${d.controlHeightSm};`,
    `  --control-h-md: ${d.controlHeightMd};`,
    `  --control-h-lg: ${d.controlHeightLg};`,
    `  --control-pad-x: ${d.controlPadX};`,
    `  --density-gap: ${d.gap};`,
  ].join("\n");
}

function staticBlock(): string {
  const s = staticTokens;
  const lines: string[] = [];
  lines.push(`  --font-sans: ${s.font.sans};`);
  lines.push(`  --font-mono: ${s.font.mono};`);
  for (const [k, v] of Object.entries(s.text)) {
    lines.push(`  --text-${k}: ${v.size};`);
    lines.push(`  --text-${k}--line-height: ${v.leading};`);
  }
  for (const [k, v] of Object.entries(s.motion)) lines.push(`  --motion-${k}: ${v};`);
  for (const [k, v] of Object.entries(s.z)) lines.push(`  --z-${k}: ${v};`);
  for (const [k, v] of Object.entries(s.blur)) lines.push(`  --blur-${k}: ${v};`);
  return lines.join("\n");
}

/**
 * Tailwind v4 @theme mapping: semantic utilities (bg-surface, text-muted,
 * border-strong, …) resolve to the runtime custom properties, so every axis
 * switch is an attribute flip on <html> — never a React re-render.
 */
function tailwindThemeBlock(): string {
  const colorNames = Object.keys(light) as Array<keyof ColorTheme>;
  const lines: string[] = [];
  for (const name of colorNames) {
    if (name.startsWith("shadow-")) continue;
    lines.push(`  --color-${name}: var(--${name});`);
  }
  lines.push(`  --shadow-1: var(--shadow-1);`);
  lines.push(`  --shadow-2: var(--shadow-2);`);
  lines.push(`  --font-sans: var(--font-sans);`);
  lines.push(`  --font-mono: var(--font-mono);`);
  for (const k of Object.keys(staticTokens.text)) {
    lines.push(`  --text-${k}: var(--text-${k});`);
    lines.push(`  --text-${k}--line-height: var(--text-${k}--line-height);`);
  }
  for (const k of Object.keys(styleShape.modern.radius)) {
    lines.push(`  --radius-${k}: var(--radius-${k});`);
  }
  lines.push(`  --ease-out: var(--motion-ease-out);`);
  lines.push(`  --ease-spring: var(--motion-ease-spring);`);
  return lines.join("\n");
}

export function buildTokensCss(): string {
  const blocks: string[] = [];

  blocks.push(`:root {\n${staticBlock()}\n${shapeBlock(DEFAULT_STYLE)}\n${densityBlock(DEFAULT_DENSITY)}\n}`);

  // Theme defaults: default style's neutrals + default accent + semantics, per theme.
  for (const theme of THEMES) {
    const selector =
      theme === "light" ? `:root,\n[data-theme="light"]` : `[data-theme="dark"]`;
    blocks.push(
      `${selector} {\n  color-scheme: ${theme};\n${colorBlock(styleNeutrals[DEFAULT_STYLE][theme])}\n${colorBlock(accentPalette[DEFAULT_ACCENT][theme])}\n}`,
    );
  }

  // Style axis — neutrals + shape only (accent is independent). Default style needs no rule.
  for (const style of STYLES) {
    if (style === DEFAULT_STYLE) continue;
    for (const theme of THEMES) {
      const selector =
        theme === "light" ? `[data-style="${style}"]` : `[data-theme="dark"][data-style="${style}"]`;
      const shape = theme === "light" ? `${shapeBlock(style)}\n` : "";
      blocks.push(`${selector} {\n${shape}${colorBlock(styleNeutrals[style][theme])}\n}`);
    }
  }

  // Accent axis — accent slice only, independent of style. Default accent needs no rule.
  for (const accent of ACCENTS) {
    if (accent === DEFAULT_ACCENT) continue;
    for (const theme of THEMES) {
      const selector =
        theme === "light" ? `[data-accent="${accent}"]` : `[data-theme="dark"][data-accent="${accent}"]`;
      blocks.push(`${selector} {\n${colorBlock(accentPalette[accent][theme])}\n}`);
    }
  }

  // Density axis — control sizing only. Default density needs no rule.
  for (const density of DENSITIES) {
    if (density === DEFAULT_DENSITY) continue;
    blocks.push(`[data-density="${density}"] {\n${densityBlock(density)}\n}`);
  }

  // Contrast axis — AAA neutrals per style, AAA accent per color, layered on top.
  for (const style of STYLES) {
    for (const theme of THEMES) {
      const attrs =
        style === DEFAULT_STYLE
          ? `[data-contrast="high"]`
          : `[data-style="${style}"][data-contrast="high"]`;
      const selector = theme === "light" ? attrs : `[data-theme="dark"]${attrs}`;
      blocks.push(`${selector} {\n${colorBlock(highContrastNeutralsByStyle[style][theme])}\n}`);
    }
  }
  for (const accent of ACCENTS) {
    for (const theme of THEMES) {
      const attrs =
        accent === DEFAULT_ACCENT
          ? `[data-contrast="high"]`
          : `[data-accent="${accent}"][data-contrast="high"]`;
      const selector = theme === "light" ? attrs : `[data-theme="dark"]${attrs}`;
      blocks.push(`${selector} {\n${colorBlock(accentHighContrastPalette[accent][theme])}\n}`);
    }
  }

  blocks.push(`@theme inline {\n${tailwindThemeBlock()}\n}`);

  return `/*
 * GENERATED FILE — do not edit.
 * Source: src/tokens/tokens.ts · Regenerate: pnpm --filter @omnio/ui gen:tokens
 * A test (tokens/generated.test.ts) fails if this file drifts from the source.
 *
 * Four independent attribute axes on <html>: [data-theme] (light/dark),
 * [data-style] (classic/modern/minimal/accessible), [data-accent]
 * (indigo/blue/purple/green/orange), [data-density]
 * (compact/comfortable/large). Each rule below sets only the properties that
 * axis owns, so any combination composes correctly through the cascade —
 * no cross-product of rules needed (docs/architecture/05-design-system.md §7).
 */

${blocks.join("\n\n")}
`;
}
