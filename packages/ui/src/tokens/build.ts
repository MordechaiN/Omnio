import {
  type ColorTheme,
  type ThemeName,
  classicDark,
  classicHighContrast,
  classicLight,
  classicStaticTokens,
  dark,
  highContrast,
  light,
  staticTokens,
} from "./tokens.ts";

function colorBlock(theme: ColorTheme | Partial<ColorTheme>): string {
  return Object.entries(theme)
    .map(([name, value]) => `  --${name}: ${value};`)
    .join("\n");
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
  for (const [k, v] of Object.entries(s.radius)) lines.push(`  --radius-${k}: ${v};`);
  for (const [k, v] of Object.entries(s.motion)) lines.push(`  --motion-${k}: ${v};`);
  for (const [k, v] of Object.entries(s.z)) lines.push(`  --z-${k}: ${v};`);
  for (const [k, v] of Object.entries(s.blur)) lines.push(`  --blur-${k}: ${v};`);
  lines.push(`  --focus-ring-width: ${s.focusRingWidth};`);
  return lines.join("\n");
}

/** The classic-style overrides for radius + focus-ring-width. */
function classicStaticBlock(): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(classicStaticTokens.radius)) {
    lines.push(`  --radius-${k}: ${v};`);
  }
  lines.push(`  --focus-ring-width: ${classicStaticTokens.focusRingWidth};`);
  return lines.join("\n");
}

/**
 * Tailwind v4 @theme mapping: semantic utilities (bg-surface, text-muted,
 * border-strong, …) resolve to the runtime custom properties, so theme and
 * style switching never touches React — it's an attribute flip on <html>.
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
  for (const k of Object.keys(staticTokens.radius)) {
    lines.push(`  --radius-${k}: var(--radius-${k});`);
  }
  lines.push(`  --ease-out: var(--motion-ease-out);`);
  lines.push(`  --ease-spring: var(--motion-ease-spring);`);
  return lines.join("\n");
}

export function buildTokensCss(): string {
  const themes: Record<ThemeName, ColorTheme> = { light, dark };
  return `/*
 * GENERATED FILE — do not edit.
 * Source: src/tokens/tokens.ts · Regenerate: pnpm --filter @omnio/ui gen:tokens
 * A test (tokens/generated.test.ts) fails if this file drifts from the source.
 */

:root {
${staticBlock()}
}

:root,
[data-theme="light"] {
  color-scheme: light;
${colorBlock(themes.light)}
}

[data-theme="dark"] {
  color-scheme: dark;
${colorBlock(themes.dark)}
}

/* Style axis — friendly is the default (no attribute needed); classic
   restores the original palette + shape exactly (docs/architecture/05-design-system.md §2). */
[data-style="classic"] {
${classicStaticBlock()}
${colorBlock(classicLight)}
}

[data-theme="dark"][data-style="classic"] {
${colorBlock(classicDark)}
}

[data-contrast="high"] {
${colorBlock(highContrast.light)}
}

[data-theme="dark"][data-contrast="high"] {
${colorBlock(highContrast.dark)}
}

[data-style="classic"][data-contrast="high"] {
${colorBlock(classicHighContrast.light)}
}

[data-theme="dark"][data-style="classic"][data-contrast="high"] {
${colorBlock(classicHighContrast.dark)}
}

@theme inline {
${tailwindThemeBlock()}
}
`;
}
