import { describe, expect, it } from "vitest";
import { dataUrlToPngBytes, fitSignatureRect } from "./signatures.ts";

describe("fitSignatureRect", () => {
  it("letterboxes a wide signature into a square box without distorting it", () => {
    // 200x50 mark (4:1) into a 100x100 box → 100x25, centred vertically.
    expect(fitSignatureRect({ width: 200, height: 50 }, { x0: 0, y0: 0, x1: 100, y1: 100 })).toEqual({
      x0: 0,
      y0: 37.5,
      x1: 100,
      y1: 62.5,
    });
  });

  it("pillarboxes a tall signature, centring it horizontally", () => {
    expect(fitSignatureRect({ width: 50, height: 200 }, { x0: 0, y0: 0, x1: 100, y1: 100 })).toEqual({
      x0: 37.5,
      y0: 0,
      x1: 62.5,
      y1: 100,
    });
  });

  it("preserves the aspect ratio it was given", () => {
    const r = fitSignatureRect({ width: 300, height: 100 }, { x0: 10, y0: 20, x1: 70, y1: 80 });
    expect((r.x1 - r.x0) / (r.y1 - r.y0)).toBeCloseTo(3, 10);
  });

  it("normalizes a box dragged right-to-left / bottom-to-top", () => {
    expect(fitSignatureRect({ width: 100, height: 100 }, { x0: 90, y0: 90, x1: 10, y1: 10 })).toEqual({
      x0: 10,
      y0: 10,
      x1: 90,
      y1: 90,
    });
  });

  it("degrades to the box rather than dividing by zero on a degenerate image", () => {
    expect(fitSignatureRect({ width: 0, height: 0 }, { x0: 5, y0: 5, x1: 25, y1: 15 })).toEqual({
      x0: 5,
      y0: 5,
      x1: 25,
      y1: 15,
    });
  });
});

describe("dataUrlToPngBytes", () => {
  it("decodes base64 PNG payloads to bytes", () => {
    // "PNG" in base64 is UE5H
    expect(Array.from(dataUrlToPngBytes("data:image/png;base64,UE5H"))).toEqual([0x50, 0x4e, 0x47]);
  });

  it("rejects a non-PNG data URL rather than embedding untrusted bytes", () => {
    expect(() => dataUrlToPngBytes("data:image/svg+xml;base64,UE5H")).toThrow(/image\/png/);
  });

  it("rejects a plain URL", () => {
    expect(() => dataUrlToPngBytes("https://example.com/sig.png")).toThrow();
  });
});
