import { describe, expect, it } from "vitest";
import { convert, unitsFor } from "./units.ts";

describe("length", () => {
  it("converts km to miles", () => {
    expect(convert("length", "km", "mi", 42.195)).toBeCloseTo(26.2188, 3);
  });

  it("converts inches to cm", () => {
    expect(convert("length", "in", "cm", 1)).toBeCloseTo(2.54, 5);
  });
});

describe("mass", () => {
  it("converts pounds to kg", () => {
    expect(convert("mass", "lb", "kg", 10)).toBeCloseTo(4.5359237, 5);
  });
});

describe("temperature", () => {
  it("converts C to F", () => {
    expect(convert("temperature", "c", "f", 100)).toBe(212);
  });

  it("converts F to C", () => {
    expect(convert("temperature", "f", "c", 32)).toBe(0);
  });

  it("converts C to K", () => {
    expect(convert("temperature", "c", "k", 0)).toBeCloseTo(273.15, 5);
  });
});

describe("unitsFor", () => {
  it("lists temperature units", () => {
    expect(unitsFor("temperature")).toEqual(["c", "f", "k"]);
  });

  it("lists linear units", () => {
    expect(unitsFor("mass")).toContain("kg");
  });
});
