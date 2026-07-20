import { describe, expect, it } from "vitest";
import { computeHistogram, formatPalette, simulateColorBlindness } from "./analysis.ts";

function solidPixels(r: number, g: number, b: number, a: number, count: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < count; i += 1) {
    pixels[i * 4] = r;
    pixels[i * 4 + 1] = g;
    pixels[i * 4 + 2] = b;
    pixels[i * 4 + 3] = a;
  }
  return pixels;
}

describe("computeHistogram", () => {
  it("bins a solid color into a single bucket per channel", () => {
    const hist = computeHistogram(solidPixels(200, 50, 10, 255, 10));
    expect(hist.red[200]).toBe(10);
    expect(hist.green[50]).toBe(10);
    expect(hist.blue[10]).toBe(10);
    expect(hist.red.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it("skips near-transparent pixels", () => {
    const hist = computeHistogram(solidPixels(100, 100, 100, 0, 5));
    expect(hist.red.reduce((a, b) => a + b, 0)).toBe(0);
  });

  it("computes luminance via the standard weights", () => {
    const hist = computeHistogram(solidPixels(255, 255, 255, 255, 1));
    expect(hist.luminance[255]).toBe(1);
  });
});

describe("simulateColorBlindness", () => {
  it("preserves alpha and array length", () => {
    const pixels = solidPixels(120, 200, 40, 200, 3);
    const out = simulateColorBlindness(pixels, "deuteranopia");
    expect(out.length).toBe(pixels.length);
    expect(out[3]).toBe(200);
  });

  it("leaves black and white essentially unchanged (matrices are row-stochastic)", () => {
    for (const type of ["protanopia", "deuteranopia", "tritanopia"] as const) {
      const white = simulateColorBlindness(solidPixels(255, 255, 255, 255, 1), type);
      expect(white[0]).toBeGreaterThan(250);
      expect(white[1]).toBeGreaterThan(250);
      expect(white[2]).toBeGreaterThan(250);
      const black = simulateColorBlindness(solidPixels(0, 0, 0, 255, 1), type);
      expect(black[0]).toBe(0);
      expect(black[1]).toBe(0);
      expect(black[2]).toBe(0);
    }
  });
});

describe("formatPalette", () => {
  const colors = ["#ff0000", "#00ff00"];

  it("formats as CSS custom properties", () => {
    expect(formatPalette(colors, "css")).toBe(
      ":root {\n  --color-1: #ff0000;\n  --color-2: #00ff00;\n}",
    );
  });

  it("formats as SCSS variables", () => {
    expect(formatPalette(colors, "scss")).toBe("$color-1: #ff0000;\n$color-2: #00ff00;");
  });

  it("formats as JSON and plain hex list", () => {
    expect(formatPalette(colors, "json")).toBe(JSON.stringify(colors, null, 2));
    expect(formatPalette(colors, "hex")).toBe("#ff0000\n#00ff00");
  });
});
