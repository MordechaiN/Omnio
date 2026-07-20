/**
 * Pixel-level image analysis — histogram binning, color-blindness simulation
 * matrices, and palette export formatting. Pure functions operating on
 * ImageData-shaped pixel arrays so they're testable without a canvas.
 */

export interface Histogram {
  red: number[];
  green: number[];
  blue: number[];
  luminance: number[];
}

/** 256-bucket per-channel histogram, alpha-aware (transparent pixels skipped). */
export function computeHistogram(pixels: Uint8ClampedArray): Histogram {
  const red = new Array<number>(256).fill(0);
  const green = new Array<number>(256).fill(0);
  const blue = new Array<number>(256).fill(0);
  const luminance = new Array<number>(256).fill(0);
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3]! < 8) continue;
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    red[r]! += 1;
    green[g]! += 1;
    blue[b]! += 1;
    luminance[Math.round(0.299 * r + 0.587 * g + 0.114 * b)]! += 1;
  }
  return { red, green, blue, luminance };
}

export type ColorBlindnessType = "protanopia" | "deuteranopia" | "tritanopia";

/** Brettel/Viénot-style simulation matrices (row-major 3×3, applied to linear-ish sRGB). */
const MATRICES: Record<ColorBlindnessType, number[]> = {
  protanopia: [0.567, 0.433, 0, 0.558, 0.442, 0, 0, 0.242, 0.758],
  deuteranopia: [0.625, 0.375, 0, 0.7, 0.3, 0, 0, 0.3, 0.7],
  tritanopia: [0.95, 0.05, 0, 0, 0.433, 0.567, 0, 0.475, 0.525],
};

export function simulateColorBlindness(pixels: Uint8ClampedArray, type: ColorBlindnessType): Uint8ClampedArray {
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = MATRICES[type]!;
  const out = new Uint8ClampedArray(pixels.length);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    out[i] = m0! * r + m1! * g + m2! * b;
    out[i + 1] = m3! * r + m4! * g + m5! * b;
    out[i + 2] = m6! * r + m7! * g + m8! * b;
    out[i + 3] = pixels[i + 3]!;
  }
  return out;
}

export type PaletteFormat = "css" | "json" | "scss" | "hex";

export function formatPalette(colors: string[], format: PaletteFormat): string {
  switch (format) {
    case "css":
      return `:root {\n${colors.map((c, i) => `  --color-${i + 1}: ${c};`).join("\n")}\n}`;
    case "scss":
      return colors.map((c, i) => `$color-${i + 1}: ${c};`).join("\n");
    case "json":
      return JSON.stringify(colors, null, 2);
    case "hex":
      return colors.join("\n");
  }
}
