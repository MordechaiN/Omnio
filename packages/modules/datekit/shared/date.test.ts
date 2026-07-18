import { describe, expect, it } from "vitest";
import { diffYMD, parseDate, totalDays } from "./date.ts";

const d = (s: string) => parseDate(s)!;

describe("diffYMD", () => {
  it("computes an exact age", () => {
    expect(diffYMD(d("1990-01-15"), d("2020-01-15"))).toEqual({ years: 30, months: 0, days: 0 });
  });

  it("borrows across months", () => {
    expect(diffYMD(d("2020-01-31"), d("2020-03-01"))).toEqual({ years: 0, months: 1, days: 1 });
  });

  it("is order-independent", () => {
    expect(diffYMD(d("2020-03-01"), d("2020-01-31"))).toEqual({ years: 0, months: 1, days: 1 });
  });

  it("handles a leap day", () => {
    expect(diffYMD(d("2020-02-29"), d("2021-02-28"))).toEqual({ years: 0, months: 11, days: 30 });
  });
});

describe("totalDays", () => {
  it("counts whole days", () => {
    expect(totalDays(d("2020-01-01"), d("2020-12-31"))).toBe(365);
  });
});

describe("parseDate", () => {
  it("rejects impossible dates", () => {
    expect(parseDate("2021-02-30")).toBeNull();
    expect(parseDate("not-a-date")).toBeNull();
  });
});
