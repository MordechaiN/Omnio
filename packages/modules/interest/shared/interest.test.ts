import { describe, expect, it } from "vitest";
import { isValidInput, projectGrowth } from "./interest.ts";

describe("projectGrowth", () => {
  it("compounds a lump sum with no contributions", () => {
    // 1000 at 12%/year compounded monthly for 1 year = 1000 × (1.01)^12
    const result = projectGrowth({
      principal: 1000,
      monthlyContribution: 0,
      annualRatePercent: 12,
      years: 1,
    });
    expect(result.finalBalance).toBeCloseTo(1000 * 1.01 ** 12, 6);
    expect(result.totalContributed).toBe(1000);
    expect(result.totalInterest).toBeCloseTo(1000 * 1.01 ** 12 - 1000, 6);
  });

  it("accumulates end-of-month contributions (ordinary annuity)", () => {
    // FV of 100/month for 12 months at 1%/month = 100 × ((1.01^12 − 1) / 0.01)
    const result = projectGrowth({
      principal: 0,
      monthlyContribution: 100,
      annualRatePercent: 12,
      years: 1,
    });
    expect(result.finalBalance).toBeCloseTo((100 * (1.01 ** 12 - 1)) / 0.01, 6);
    expect(result.totalContributed).toBe(1200);
  });

  it("handles a zero rate as plain accumulation", () => {
    const result = projectGrowth({
      principal: 500,
      monthlyContribution: 50,
      annualRatePercent: 0,
      years: 2,
    });
    expect(result.finalBalance).toBeCloseTo(500 + 50 * 24, 9);
    expect(result.totalInterest).toBeCloseTo(0, 9);
  });

  it("produces one row per year with a monotone balance", () => {
    const result = projectGrowth({
      principal: 1000,
      monthlyContribution: 100,
      annualRatePercent: 5,
      years: 10,
    });
    expect(result.rows).toHaveLength(10);
    for (let i = 1; i < result.rows.length; i += 1) {
      expect(result.rows[i]!.balance).toBeGreaterThan(result.rows[i - 1]!.balance);
    }
    expect(result.rows.at(-1)!.balance).toBeCloseTo(result.finalBalance, 9);
  });
});

describe("isValidInput", () => {
  const base = { principal: 1000, monthlyContribution: 100, annualRatePercent: 5, years: 10 };

  it("accepts sensible input", () => {
    expect(isValidInput(base)).toBe(true);
  });

  it("rejects negatives, non-finite values, and out-of-range years", () => {
    expect(isValidInput({ ...base, principal: -1 })).toBe(false);
    expect(isValidInput({ ...base, monthlyContribution: Number.NaN })).toBe(false);
    expect(isValidInput({ ...base, annualRatePercent: 101 })).toBe(false);
    expect(isValidInput({ ...base, years: 0 })).toBe(false);
    expect(isValidInput({ ...base, years: 2.5 })).toBe(false);
  });
});
