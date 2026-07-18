import { describe, expect, it } from "vitest";
import { replaceRegex, testRegex } from "./regex.ts";

describe("testRegex", () => {
  it("finds all matches with indices", () => {
    const result = testRegex("\\d+", "", "a1 b22 c333");
    expect(result.matches.map((m) => m.match)).toEqual(["1", "22", "333"]);
    expect(result.matches[1]!.index).toBe(4);
  });

  it("captures numbered and named groups", () => {
    const result = testRegex("(?<year>\\d{4})-(\\d{2})", "", "2026-07");
    expect(result.matches[0]!.groups).toEqual(["2026", "07"]);
    expect(result.matches[0]!.namedGroups.year).toBe("2026");
  });

  it("reports an invalid pattern instead of throwing", () => {
    const result = testRegex("(", "", "x");
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("handles zero-width matches without looping forever", () => {
    const result = testRegex("a*", "", "aXa");
    expect(result.matches.length).toBeGreaterThan(0);
  });

  it("replaces with backreferences", () => {
    expect(replaceRegex("(\\w+)@(\\w+)", "g", "a@b c@d", "$2.$1").output).toBe("b.a d.c");
  });
});
