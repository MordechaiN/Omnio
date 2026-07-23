import { describe, expect, it } from "vitest";
import { normalizeRect, screenToPdf } from "./annotations.ts";

describe("screenToPdf", () => {
  it("divides out scale and flips the y axis", () => {
    // page 200pt tall, rendered at 2px/pt; a click 40px down from the top…
    expect(screenToPdf(100, 40, 200, 2)).toEqual({ x: 50, y: 180 });
  });
});

describe("normalizeRect", () => {
  it("orders corners regardless of drag direction", () => {
    expect(normalizeRect({ x: 30, y: 10 }, { x: 5, y: 40 })).toEqual({ x0: 5, y0: 10, x1: 30, y1: 40 });
  });
});
