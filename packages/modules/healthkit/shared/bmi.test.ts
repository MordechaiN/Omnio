import { describe, expect, it } from "vitest";
import { bmiImperial, bmiMetric, categorize } from "./bmi.ts";

describe("categorize", () => {
  it("maps the WHO cut-offs", () => {
    expect(categorize(17)).toBe("underweight");
    expect(categorize(22)).toBe("normal");
    expect(categorize(27)).toBe("overweight");
    expect(categorize(33)).toBe("obese");
  });
});

describe("bmiMetric", () => {
  it("computes and rounds BMI", () => {
    const r = bmiMetric(70, 175);
    expect(r.bmi).toBe(22.9);
    expect(r.category).toBe("normal");
  });

  it("rejects non-positive inputs", () => {
    expect(bmiMetric(0, 175).ok).toBe(false);
    expect(bmiMetric(70, 0).ok).toBe(false);
  });
});

describe("bmiImperial", () => {
  it("matches the metric result after conversion", () => {
    const r = bmiImperial(154, 68.9);
    expect(r.bmi).toBeCloseTo(22.8, 1);
  });
});
