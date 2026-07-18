import { describe, expect, it } from "vitest";
import { DEFAULT_SLUG_OPTIONS, slugify } from "./slugify.ts";

describe("slugify", () => {
  it("makes a basic slug", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
  });

  it("strips accents to ASCII", () => {
    expect(slugify("Crème Brûlée")).toBe("creme-brulee");
  });

  it("respects a custom separator", () => {
    expect(slugify("a b c", { ...DEFAULT_SLUG_OPTIONS, separator: "_" })).toBe("a_b_c");
  });

  it("can preserve case", () => {
    expect(slugify("Hello World", { ...DEFAULT_SLUG_OPTIONS, lowercase: false })).toBe(
      "Hello-World",
    );
  });

  it("keeps Hebrew when Unicode is allowed", () => {
    expect(slugify("שלום עולם", { ...DEFAULT_SLUG_OPTIONS, allowUnicode: true })).toBe("שלום-עולם");
  });

  it("drops non-Latin in ASCII mode", () => {
    expect(slugify("שלום world")).toBe("world");
  });
});
