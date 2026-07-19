/**
 * Pure geometry and naming helpers for the image resizer. The canvas work
 * happens in the frontend; everything testable without a DOM lives here.
 */

export interface Dimensions {
  width: number;
  height: number;
}

export type OutputFormat = "image/png" | "image/jpeg" | "image/webp";

export const OUTPUT_FORMATS: readonly OutputFormat[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

const EXTENSIONS: Record<OutputFormat, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * Target dimensions when one side is edited with the aspect ratio locked.
 * The untouched side is derived, rounded, and clamped to at least 1px.
 */
export function lockedDimensions(
  original: Dimensions,
  edited: "width" | "height",
  value: number,
): Dimensions {
  const clamped = Math.max(1, Math.round(value));
  if (edited === "width") {
    return {
      width: clamped,
      height: Math.max(1, Math.round((clamped * original.height) / original.width)),
    };
  }
  return {
    width: Math.max(1, Math.round((clamped * original.width) / original.height)),
    height: clamped,
  };
}

/** Dimensions after scaling by a percentage (e.g. 50 → half size). */
export function scaledDimensions(original: Dimensions, percent: number): Dimensions {
  return {
    width: Math.max(1, Math.round((original.width * percent) / 100)),
    height: Math.max(1, Math.round((original.height * percent) / 100)),
  };
}

/** Output filename: original base name + new size + correct extension. */
export function outputFilename(inputName: string, size: Dimensions, format: OutputFormat): string {
  const base = inputName.replace(/\.[^.]+$/, "") || "image";
  return `${base}-${size.width}x${size.height}.${EXTENSIONS[format]}`;
}

export function isValidDimension(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 20000;
}

/** Human-readable byte size, base-1024. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
