import { describe, expect, it } from "vitest";
import { clampMargin, duplicatedOrder, nUpLayout, reversedOrder } from "./operations.ts";

describe("reversedOrder", () => {
  it("reverses page indices", () => {
    expect(reversedOrder(4)).toEqual([3, 2, 1, 0]);
    expect(reversedOrder(1)).toEqual([0]);
    expect(reversedOrder(0)).toEqual([]);
  });
});

describe("duplicatedOrder", () => {
  it("doubles only the selected pages, in place", () => {
    expect(duplicatedOrder(4, new Set([1]))).toEqual([0, 1, 1, 2, 3]);
    expect(duplicatedOrder(3, new Set([0, 2]))).toEqual([0, 0, 1, 2, 2]);
  });

  it("returns the plain order when nothing is selected", () => {
    expect(duplicatedOrder(3, new Set())).toEqual([0, 1, 2]);
  });
});

describe("nUpLayout", () => {
  it("lays 4 pages into a 2x2 grid in reading order", () => {
    const layout = nUpLayout(4, 4);
    expect(layout).toMatchObject({ cols: 2, rows: 2 });
    expect(layout.cells).toEqual([
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 0, row: 1 },
      { col: 1, row: 1 },
    ]);
  });

  it("wraps onto a new sheet past the per-sheet count", () => {
    const layout = nUpLayout(3, 2);
    expect(layout.cells).toEqual([
      { col: 0, row: 0 },
      { col: 0, row: 1 },
      { col: 0, row: 0 }, // third page starts sheet 2
    ]);
  });

  it("handles 9-up", () => {
    expect(nUpLayout(9, 9)).toMatchObject({ cols: 3, rows: 3 });
  });
});

describe("clampMargin", () => {
  it("keeps sane margins and caps extremes", () => {
    expect(clampMargin(0.1)).toBe(0.1);
    expect(clampMargin(-1)).toBe(0);
    expect(clampMargin(0.9)).toBe(0.45);
  });
});
