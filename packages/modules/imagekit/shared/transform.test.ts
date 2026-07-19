import { describe, expect, it } from "vitest";
import {
  centeredAspectCrop,
  clampCrop,
  dominantColors,
  rgbToHex,
  rotatedDimensions,
  sharpenKernel,
  simplifyRatio,
} from "./transform.ts";

describe("rotatedDimensions", () => {
  it("swaps sides on quarter turns and keeps them on half turns", () => {
    const source = { width: 1600, height: 900 };
    expect(rotatedDimensions(source, 90)).toEqual({ width: 900, height: 1600 });
    expect(rotatedDimensions(source, 270)).toEqual({ width: 900, height: 1600 });
    expect(rotatedDimensions(source, 180)).toEqual(source);
    expect(rotatedDimensions(source, 0)).toEqual(source);
  });
});

describe("clampCrop", () => {
  const image = { width: 100, height: 80 };

  it("keeps an in-bounds rect", () => {
    expect(clampCrop({ x: 10, y: 10, width: 50, height: 40 }, image)).toEqual({
      x: 10,
      y: 10,
      width: 50,
      height: 40,
    });
  });

  it("pulls an overflowing rect back inside", () => {
    expect(clampCrop({ x: 80, y: 70, width: 50, height: 40 }, image)).toEqual({
      x: 50,
      y: 40,
      width: 50,
      height: 40,
    });
  });

  it("caps size at the image and floors at 1px", () => {
    expect(clampCrop({ x: 0, y: 0, width: 500, height: 0 }, image)).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 1,
    });
  });
});

describe("centeredAspectCrop", () => {
  it("crops a wide image to square from the center", () => {
    expect(centeredAspectCrop({ width: 200, height: 100 }, 1, 1)).toEqual({
      x: 50,
      y: 0,
      width: 100,
      height: 100,
    });
  });

  it("crops a square image to 16:9", () => {
    const crop = centeredAspectCrop({ width: 1000, height: 1000 }, 16, 9);
    expect(crop.width).toBe(1000);
    expect(crop.height).toBe(563);
    expect(crop.y).toBe(219);
  });
});

describe("simplifyRatio", () => {
  it("reduces common resolutions", () => {
    expect(simplifyRatio(1920, 1080)).toEqual([16, 9]);
    expect(simplifyRatio(1024, 768)).toEqual([4, 3]);
    expect(simplifyRatio(7, 5)).toEqual([7, 5]);
  });
});

describe("sharpenKernel", () => {
  it("is identity at zero strength", () => {
    expect(sharpenKernel(0)).toEqual([0, -0, 0, -0, 1, -0, 0, -0, 0]);
  });

  it("sums to 1 at any strength (brightness preserved)", () => {
    for (const s of [0.25, 0.5, 1]) {
      const sum = sharpenKernel(s).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 9);
    }
  });
});

describe("dominantColors", () => {
  it("finds the dominant color of a solid image", () => {
    const pixels = new Uint8ClampedArray(4 * 100);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 200;
      pixels[i + 1] = 40;
      pixels[i + 2] = 40;
      pixels[i + 3] = 255;
    }
    const colors = dominantColors(pixels, 3, 1);
    expect(colors).toHaveLength(1);
    expect(colors[0]!.r).toBe(200);
    expect(colors[0]!.share).toBe(1);
  });

  it("ranks a two-tone image by share and skips transparent pixels", () => {
    const pixels = new Uint8ClampedArray(4 * 100);
    for (let i = 0; i < pixels.length; i += 4) {
      const white = i < 4 * 75;
      pixels[i] = white ? 255 : 0;
      pixels[i + 1] = white ? 255 : 0;
      pixels[i + 2] = white ? 255 : 200;
      pixels[i + 3] = i < 4 * 90 ? 255 : 0; // last 10 transparent
    }
    const colors = dominantColors(pixels, 2, 1);
    expect(colors).toHaveLength(2);
    expect(colors[0]!.r).toBe(255);
    expect(colors[0]!.share).toBeGreaterThan(colors[1]!.share);
  });
});

describe("rgbToHex", () => {
  it("formats with padding", () => {
    expect(rgbToHex(255, 0, 10)).toBe("#ff000a");
  });
});
