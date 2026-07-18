import { describe, expect, it } from "vitest";
import {
  dedupeLines,
  removeBlankLines,
  reverseLines,
  shuffleLines,
  sortLines,
  trimLines,
} from "./line-tools.ts";

describe("line tools", () => {
  it("sorts ascending and descending, numeric-aware", () => {
    expect(sortLines("b\na10\na2", "asc")).toBe("a2\na10\nb");
    expect(sortLines("a\nb\nc", "desc")).toBe("c\nb\na");
  });

  it("dedupes keeping first occurrence", () => {
    expect(dedupeLines("a\nb\na\nc\nb")).toBe("a\nb\nc");
  });

  it("dedupes case-insensitively when asked", () => {
    expect(dedupeLines("A\na", { trim: false, caseInsensitive: true })).toBe("A");
  });

  it("reverses order", () => {
    expect(reverseLines("1\n2\n3")).toBe("3\n2\n1");
  });

  it("removes blank lines and trims", () => {
    expect(removeBlankLines("a\n\n  \nb")).toBe("a\nb");
    expect(trimLines("  a \n b ")).toBe("a\nb");
  });

  it("shuffles deterministically with a seeded random", () => {
    const seq = [0.9, 0.1, 0.5];
    let i = 0;
    const shuffled = shuffleLines("a\nb\nc", () => seq[i++ % seq.length]!);
    expect(shuffled.split("\n").sort()).toEqual(["a", "b", "c"]);
  });
});
