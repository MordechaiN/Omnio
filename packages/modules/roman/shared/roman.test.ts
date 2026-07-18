import { describe, expect, it } from "vitest";
import { fromRoman, toRoman } from "./roman.ts";

describe("toRoman", () => {
  it("encodes canonical numerals", () => {
    expect(toRoman(4).value).toBe("IV");
    expect(toRoman(1994).value).toBe("MCMXCIV");
    expect(toRoman(3999).value).toBe("MMMCMXCIX");
  });

  it("rejects out-of-range values", () => {
    expect(toRoman(0).ok).toBe(false);
    expect(toRoman(4000).ok).toBe(false);
  });
});

describe("fromRoman", () => {
  it("decodes canonical numerals", () => {
    expect(fromRoman("MCMXCIV").value).toBe(1994);
    expect(fromRoman("xiv").value).toBe(14);
  });

  it("rejects malformed numerals", () => {
    expect(fromRoman("IIII").ok).toBe(false);
    expect(fromRoman("IC").ok).toBe(false);
    expect(fromRoman("ABC").ok).toBe(false);
  });

  it("round-trips every value 1–3999", () => {
    for (let n = 1; n <= 3999; n += 1) {
      expect(fromRoman(toRoman(n).value as string).value).toBe(n);
    }
  });
});
