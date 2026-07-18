import { describe, expect, it } from "vitest";
import { diffLines, summarize } from "./text-diff.ts";

describe("diffLines", () => {
  it("marks equal lines", () => {
    const rows = diffLines("a\nb", "a\nb");
    expect(rows.every((r) => r.op === "equal")).toBe(true);
  });

  it("detects an added line", () => {
    const rows = diffLines("a\nc", "a\nb\nc");
    expect(summarize(rows)).toEqual({ added: 1, removed: 0 });
    expect(rows.find((r) => r.op === "add")!.text).toBe("b");
  });

  it("detects a removed line", () => {
    const rows = diffLines("a\nb\nc", "a\nc");
    expect(summarize(rows)).toEqual({ added: 0, removed: 1 });
  });

  it("detects a changed line as remove + add", () => {
    const rows = diffLines("hello", "goodbye");
    expect(summarize(rows)).toEqual({ added: 1, removed: 1 });
  });

  it("tracks line numbers", () => {
    const rows = diffLines("a\nb", "a\nx\nb");
    const added = rows.find((r) => r.op === "add")!;
    expect(added.newLine).toBe(2);
    expect(added.oldLine).toBeNull();
  });
});
