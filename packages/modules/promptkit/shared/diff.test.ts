import { describe, expect, it } from "vitest";
import { diffLines } from "./diff.ts";

describe("diffLines", () => {
  it("marks unchanged lines as equal", () => {
    expect(diffLines("a\nb\nc", "a\nb\nc")).toEqual([
      { op: "equal", text: "a" },
      { op: "equal", text: "b" },
      { op: "equal", text: "c" },
    ]);
  });

  it("detects an inserted line", () => {
    expect(diffLines("a\nc", "a\nb\nc")).toEqual([
      { op: "equal", text: "a" },
      { op: "add", text: "b" },
      { op: "equal", text: "c" },
    ]);
  });

  it("detects a removed line", () => {
    expect(diffLines("a\nb\nc", "a\nc")).toEqual([
      { op: "equal", text: "a" },
      { op: "remove", text: "b" },
      { op: "equal", text: "c" },
    ]);
  });
});
