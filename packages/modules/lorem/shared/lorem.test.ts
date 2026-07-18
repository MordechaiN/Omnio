import { describe, expect, it } from "vitest";
import { generateLorem } from "./lorem.ts";

describe("generateLorem", () => {
  it("produces the requested number of words", () => {
    expect(generateLorem("words", 5, 1).split(" ")).toHaveLength(5);
  });

  it("produces sentences ending in periods", () => {
    const text = generateLorem("sentences", 3, 1);
    expect(text.match(/\./g)).toHaveLength(3);
  });

  it("separates paragraphs with blank lines", () => {
    expect(generateLorem("paragraphs", 3, 1).split("\n\n")).toHaveLength(3);
  });

  it("is deterministic for a given seed", () => {
    expect(generateLorem("words", 20, 42)).toBe(generateLorem("words", 20, 42));
  });

  it("differs across seeds", () => {
    expect(generateLorem("words", 20, 1)).not.toBe(generateLorem("words", 20, 2));
  });

  it("clamps absurd counts", () => {
    expect(generateLorem("words", 100000, 1).split(" ").length).toBeLessThanOrEqual(200);
  });
});
