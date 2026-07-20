import { describe, expect, it } from "vitest";
import { estimateTokens, extractVariables, fillTemplate } from "./prompt.ts";

describe("extractVariables", () => {
  it("finds unique names in order, tolerating spaces", () => {
    expect(extractVariables("Hi {{name}}, {{ name }} meets {{topic}}")).toEqual(["name", "topic"]);
  });

  it("ignores malformed placeholders", () => {
    expect(extractVariables("{{a b}} {single} {{ok_1.x}}")).toEqual(["ok_1.x"]);
  });
});

describe("fillTemplate", () => {
  it("substitutes provided values and keeps missing placeholders visible", () => {
    expect(fillTemplate("Hello {{name}} about {{topic}}", { name: "Dana" })).toBe(
      "Hello Dana about {{topic}}",
    );
  });
});

describe("estimateTokens", () => {
  it("counts characters and words", () => {
    const est = estimateTokens("one two three");
    expect(est.characters).toBe(13);
    expect(est.words).toBe(3);
    expect(est.tokens).toBeGreaterThan(2);
    expect(est.tokens).toBeLessThan(8);
  });

  it("handles empty input", () => {
    expect(estimateTokens("")).toEqual({ characters: 0, words: 0, tokens: 0 });
  });
});
