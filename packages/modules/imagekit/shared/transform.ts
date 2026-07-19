/**
 * Pure math for the image transform tools — everything testable without a DOM.
 * Canvas work stays in the frontends.
 */

import type { Dimensions } from "./resize.ts";

export type Rotation = 0 | 90 | 180 | 270;

/** Canvas size after rotating an image by a quarter-turn multiple. */
export function rotatedDimensions(source: Dimensions, rotation: Rotation): Dimensions {
  return rotation === 90 || rotation === 270
    ? { width: source.height, height: source.width }
    : { ...source };
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Clamp a crop rectangle so it stays fully inside the image. */
export function clampCrop(rect: CropRect, image: Dimensions): CropRect {
  const width = Math.min(Math.max(1, Math.round(rect.width)), image.width);
  const height = Math.min(Math.max(1, Math.round(rect.height)), image.height);
  const x = Math.min(Math.max(0, Math.round(rect.x)), image.width - width);
  const y = Math.min(Math.max(0, Math.round(rect.y)), image.height - height);
  return { x, y, width, height };
}

/**
 * Largest centered crop of the image matching ratioW:ratioH.
 */
export function centeredAspectCrop(image: Dimensions, ratioW: number, ratioH: number): CropRect {
  const target = ratioW / ratioH;
  const current = image.width / image.height;
  let width = image.width;
  let height = image.height;
  if (current > target) {
    width = Math.round(image.height * target);
  } else {
    height = Math.round(image.width / target);
  }
  return clampCrop(
    { x: Math.round((image.width - width) / 2), y: Math.round((image.height - height) / 2), width, height },
    image,
  );
}

/** Reduce a width/height pair to its simplest ratio (e.g. 1920×1080 → 16:9). */
export function simplifyRatio(width: number, height: number): [number, number] {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(Math.round(width), Math.round(height)) || 1;
  return [Math.round(width) / divisor, Math.round(height) / divisor];
}

/** 3×3 sharpen convolution kernel, strength 0..1 blended toward identity. */
export function sharpenKernel(strength: number): number[] {
  const s = Math.min(1, Math.max(0, strength));
  // Identity + s × (unsharp Laplacian). At s=0 the kernel is identity.
  return [0, -s, 0, -s, 1 + 4 * s, -s, 0, -s, 0];
}

/**
 * Dominant colors by 4-bit-per-channel quantization: bucket every sampled
 * pixel, then return the most populated buckets as averaged RGB. Fast and
 * dependency-free; sampling step keeps big images cheap.
 */
export function dominantColors(
  pixels: Uint8ClampedArray,
  count: number,
  sampleStep = 4,
): Array<{ r: number; g: number; b: number; share: number }> {
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  let total = 0;
  for (let i = 0; i < pixels.length; i += 4 * sampleStep) {
    const alpha = pixels[i + 3]!;
    if (alpha < 128) continue;
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.n += 1;
    } else {
      buckets.set(key, { r, g, b, n: 1 });
    }
    total += 1;
  }
  return [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, count)
    .map((bucket) => ({
      r: Math.round(bucket.r / bucket.n),
      g: Math.round(bucket.g / bucket.n),
      b: Math.round(bucket.b / bucket.n),
      share: total ? bucket.n / total : 0,
    }));
}

export function rgbToHex(r: number, g: number, b: number): string {
  const part = (v: number) => v.toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}
