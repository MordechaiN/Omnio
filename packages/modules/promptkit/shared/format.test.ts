import { describe, expect, it } from "vitest";
import { formatPrompt } from "./format.ts";

const allOff = { collapseBlankLines: false, trimTrailingSpaces: false, dedent: false, wrapWidth: null };

describe("formatPrompt", () => {
  it("collapses 3+ blank lines to one blank line", () => {
    expect(formatPrompt("a\n\n\n\nb", { ...allOff, collapseBlankLines: true })).toBe("a\n\nb");
  });

  it("trims trailing spaces per line", () => {
    expect(formatPrompt("a   \nb\t", { ...allOff, trimTrailingSpaces: true })).toBe("a\nb");
  });

  it("dedents uniformly indented text", () => {
    expect(formatPrompt("    a\n    b\n\n    c", { ...allOff, dedent: true })).toBe("a\nb\n\nc");
  });

  it("wraps long lines at word boundaries", () => {
    const out = formatPrompt("one two three four five", { ...allOff, wrapWidth: 10 });
    expect(out.split("\n").every((line) => line.length <= 10)).toBe(true);
    expect(out.replace(/\n/g, " ")).toBe("one two three four five");
  });

  it("always trims the overall result", () => {
    expect(formatPrompt("  \n  a  \n  ", allOff)).toBe("a");
  });
});
