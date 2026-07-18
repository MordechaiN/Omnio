import { describe, expect, it } from "vitest";
import { analyzeText } from "./text-stats.ts";

describe("analyzeText", () => {
  it("counts words, characters and sentences", () => {
    const stats = analyzeText("Hello world. How are you?");
    expect(stats.words).toBe(5);
    expect(stats.sentences).toBe(2);
    expect(stats.charactersNoSpaces).toBe(21);
  });

  it("counts lines and paragraphs", () => {
    const stats = analyzeText("a\nb\n\nc");
    expect(stats.lines).toBe(4);
    expect(stats.paragraphs).toBe(2);
  });

  it("counts Hebrew words", () => {
    const stats = analyzeText("שלום עולם כאן");
    expect(stats.words).toBe(3);
  });

  it("is all-zero for empty input", () => {
    const stats = analyzeText("");
    expect(stats.words).toBe(0);
    expect(stats.characters).toBe(0);
    expect(stats.sentences).toBe(0);
  });

  it("estimates reading time", () => {
    const text = new Array(200).fill("word").join(" ");
    expect(analyzeText(text).readingSeconds).toBe(60);
  });
});
