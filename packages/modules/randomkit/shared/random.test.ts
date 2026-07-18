import { describe, expect, it } from "vitest";
import { generateNumbers, randomInt } from "./random.ts";

describe("randomInt", () => {
  it("stays within bounds over many draws", () => {
    for (let i = 0; i < 500; i += 1) {
      const v = randomInt(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
    }
  });

  it("returns the only value for a singleton range", () => {
    expect(randomInt(5, 5)).toBe(5);
  });
});

describe("generateNumbers", () => {
  it("returns the requested count", () => {
    const r = generateNumbers({ min: 1, max: 100, count: 10, unique: false });
    expect(r.values).toHaveLength(10);
  });

  it("produces distinct values in unique mode", () => {
    const r = generateNumbers({ min: 1, max: 6, count: 6, unique: true });
    expect(new Set(r.values).size).toBe(6);
    expect([...r.values!].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("rejects unique count larger than the range", () => {
    const r = generateNumbers({ min: 1, max: 3, count: 5, unique: true });
    expect(r.ok).toBe(false);
  });

  it("rejects an inverted range", () => {
    expect(generateNumbers({ min: 10, max: 1, count: 1, unique: false }).ok).toBe(false);
  });

  it("rejects a count over 1000", () => {
    expect(generateNumbers({ min: 0, max: 9, count: 1001, unique: false }).ok).toBe(false);
  });
});
