import { describe, expect, it } from "vitest";
import { loanPayment, percentChange, percentOf, tip, vat } from "./finance.ts";

describe("loanPayment", () => {
  it("amortizes a standard loan", () => {
    const r = loanPayment(200000, 6, 30);
    expect(r.monthlyPayment).toBeCloseTo(1199.1, 1);
    expect(r.totalInterest).toBeGreaterThan(0);
  });

  it("splits evenly at zero interest", () => {
    const r = loanPayment(1200, 0, 1);
    expect(r.monthlyPayment).toBe(100);
    expect(r.totalInterest).toBe(0);
  });
});

describe("vat", () => {
  it("adds VAT to a net price", () => {
    expect(vat(100, 17, "add")).toEqual({ net: 100, vat: 17, gross: 117 });
  });

  it("extracts VAT from a gross price", () => {
    const r = vat(117, 17, "extract");
    expect(r.net).toBe(100);
    expect(r.vat).toBe(17);
  });
});

describe("percentages", () => {
  it("computes part of whole", () => {
    expect(percentOf(25, 200)).toBe(12.5);
  });

  it("computes change", () => {
    expect(percentChange(80, 100)).toBe(25);
    expect(percentChange(100, 80)).toBe(-20);
  });
});

describe("tip", () => {
  it("splits a tipped bill", () => {
    const r = tip(100, 18, 4);
    expect(r.tip).toBe(18);
    expect(r.total).toBe(118);
    expect(r.perPerson).toBe(29.5);
  });
});
