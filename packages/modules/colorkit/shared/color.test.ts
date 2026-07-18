import { describe, expect, it } from "vitest";
import { contrastRatio, parseColor, toHex, toHsl, toRgbString, wcagVerdict } from "./color.ts";

describe("parseColor", () => {
  it("expands short hex", () => {
    expect(parseColor("#0af")).toEqual({ r: 0, g: 170, b: 255 });
  });

  it("parses full hex and rgb()", () => {
    expect(parseColor("#ff8800")).toEqual({ r: 255, g: 136, b: 0 });
    expect(parseColor("rgb(10, 20, 30)")).toEqual({ r: 10, g: 20, b: 30 });
  });

  it("rejects nonsense and out-of-range", () => {
    expect(parseColor("nope")).toBeNull();
    expect(parseColor("rgb(300,0,0)")).toBeNull();
  });
});

describe("conversions", () => {
  it("round-trips hex", () => {
    expect(toHex({ r: 255, g: 136, b: 0 })).toBe("#ff8800");
  });

  it("formats rgb and hsl", () => {
    expect(toRgbString({ r: 0, g: 0, b: 0 })).toBe("rgb(0, 0, 0)");
    expect(toHsl({ r: 255, g: 0, b: 0 })).toBe("hsl(0, 100%, 50%)");
  });
});

describe("contrast", () => {
  it("gives 21:1 for black on white", () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 5);
  });

  it("passes AA but not AAA for a mid-gray on white", () => {
    const v = wcagVerdict({ r: 117, g: 117, b: 117 }, { r: 255, g: 255, b: 255 });
    expect(v.aaNormal).toBe(true);
    expect(v.aaaNormal).toBe(false);
  });
});
