import { describe, expect, it } from "vitest";
import { fromUnix, nowSeconds, toUnix } from "./timestamp.ts";

describe("fromUnix", () => {
  it("reads a seconds timestamp", () => {
    const r = fromUnix("1516239022");
    expect(r.iso).toBe("2018-01-18T01:30:22.000Z");
    expect(r.milliseconds).toBe(1516239022000);
  });

  it("reads a milliseconds timestamp", () => {
    const r = fromUnix("1516239022000");
    expect(r.seconds).toBe(1516239022);
  });

  it("rejects non-numeric input", () => {
    expect(fromUnix("yesterday").ok).toBe(false);
  });
});

describe("toUnix", () => {
  it("parses an ISO date", () => {
    const r = toUnix("2018-01-18T01:30:22Z");
    expect(r.seconds).toBe(1516239022);
  });

  it("rejects garbage", () => {
    expect(toUnix("not a date").ok).toBe(false);
  });
});

describe("nowSeconds", () => {
  it("floors a fixed clock", () => {
    expect(nowSeconds(1516239022999)).toBe(1516239022);
  });
});
