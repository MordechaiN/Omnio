import { describe, expect, it } from "vitest";
import {
  formatBytes,
  isValidDimension,
  lockedDimensions,
  outputFilename,
  scaledDimensions,
} from "./resize.ts";

describe("lockedDimensions", () => {
  const original = { width: 1600, height: 900 };

  it("derives height when width is edited", () => {
    expect(lockedDimensions(original, "width", 800)).toEqual({ width: 800, height: 450 });
  });

  it("derives width when height is edited", () => {
    expect(lockedDimensions(original, "height", 450)).toEqual({ width: 800, height: 450 });
  });

  it("rounds the derived side", () => {
    expect(lockedDimensions({ width: 3, height: 2 }, "width", 100)).toEqual({
      width: 100,
      height: 67,
    });
  });

  it("never collapses below 1px", () => {
    expect(lockedDimensions({ width: 10000, height: 10 }, "width", 1)).toEqual({
      width: 1,
      height: 1,
    });
  });
});

describe("scaledDimensions", () => {
  it("scales by percent", () => {
    expect(scaledDimensions({ width: 1600, height: 900 }, 50)).toEqual({
      width: 800,
      height: 450,
    });
    expect(scaledDimensions({ width: 100, height: 100 }, 200)).toEqual({
      width: 200,
      height: 200,
    });
  });
});

describe("outputFilename", () => {
  it("replaces the extension and appends the size", () => {
    expect(outputFilename("photo.png", { width: 800, height: 450 }, "image/jpeg")).toBe(
      "photo-800x450.jpg",
    );
    expect(outputFilename("archive.tar.gz", { width: 10, height: 10 }, "image/webp")).toBe(
      "archive.tar-10x10.webp",
    );
  });

  it("falls back for extension-only names", () => {
    expect(outputFilename(".png", { width: 1, height: 1 }, "image/png")).toBe("image-1x1.png");
  });
});

describe("isValidDimension", () => {
  it("accepts 1..20000 integers only", () => {
    expect(isValidDimension(1)).toBe(true);
    expect(isValidDimension(20000)).toBe(true);
    expect(isValidDimension(0)).toBe(false);
    expect(isValidDimension(20001)).toBe(false);
    expect(isValidDimension(2.5)).toBe(false);
    expect(isValidDimension(Number.NaN)).toBe(false);
  });
});

describe("formatBytes", () => {
  it("formats across magnitudes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
