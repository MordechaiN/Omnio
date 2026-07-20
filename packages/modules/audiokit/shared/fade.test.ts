import { describe, expect, it } from "vitest";
import { applyFade } from "./fade.ts";

describe("applyFade", () => {
  it("ramps from silence to full and back down (linear)", () => {
    const samples = new Float32Array(10).fill(1);
    const out = applyFade(samples, 10, 0.3, 0.3, "linear");
    expect(out[0]).toBeCloseTo(0, 5);
    expect(out[2]).toBeCloseTo(2 / 3, 1);
    expect(out[9]).toBeCloseTo(0, 5);
  });

  it("leaves the untouched middle at full volume", () => {
    const samples = new Float32Array(20).fill(1);
    const out = applyFade(samples, 20, 0.1, 0.1, "linear");
    expect(out[10]).toBe(1);
  });

  it("equal-power curve stays within [0, 1] and reaches both ends", () => {
    const samples = new Float32Array(10).fill(1);
    const out = applyFade(samples, 10, 0.5, 0.5, "equalPower");
    expect(out[0]).toBeCloseTo(0, 5);
    for (const value of out) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1.001);
    }
  });

  it("handles zero-length fades as a no-op", () => {
    const samples = new Float32Array([0.5, 0.5, 0.5]);
    expect(applyFade(samples, 10, 0, 0, "linear")).toEqual(samples);
  });

  it("clamps fade windows longer than the buffer", () => {
    const samples = new Float32Array(4).fill(1);
    const out = applyFade(samples, 10, 100, 100, "linear");
    expect(out.length).toBe(4);
    expect(out[0]).toBeGreaterThanOrEqual(0);
  });
});
