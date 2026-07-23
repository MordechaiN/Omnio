import { describe, expect, it } from "vitest";
import { mapWordToPdf } from "./ocr-layout.ts";

describe("mapWordToPdf", () => {
  // Page 200pt tall, rendered at scale 2 -> 400px image. A word box near the top
  // of the image must land near the top of the PDF (high y in bottom-left space).
  it("flips the y axis and divides out the render scale", () => {
    const r = mapWordToPdf({ x0: 100, y0: 40, x1: 180, y1: 80 }, 200, 2);
    expect(r.xPt).toBeCloseTo(50); // 100 / 2
    expect(r.widthPt).toBeCloseTo(40); // (180-100) / 2
    expect(r.fontSizePt).toBeCloseTo(20); // (80-40) / 2
    // baseline sits at the box bottom: pageHeight - y1/scale = 200 - 40 = 160
    expect(r.yPt).toBeCloseTo(160);
  });

  it("keeps positive width/height even for a degenerate box", () => {
    const r = mapWordToPdf({ x0: 10, y0: 10, x1: 10, y1: 10 }, 100, 1);
    expect(r.widthPt).toBe(0);
    expect(r.fontSizePt).toBeGreaterThanOrEqual(1);
  });
});
