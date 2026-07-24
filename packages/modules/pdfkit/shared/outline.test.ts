import { describe, expect, it } from "vitest";
import {
  buildOutlineTree,
  flattenOutline,
  indentAt,
  moveSubtree,
  normalizeDepths,
  outdentAt,
  subtreeEnd,
  validBookmarks,
  type FlatBookmark,
  type OutlineNode,
} from "./outline.ts";

const b = (id: string, depth: number, page = 0, title = id): FlatBookmark => ({ id, title, page, depth });

describe("flattenOutline / buildOutlineTree", () => {
  const tree: OutlineNode[] = [
    { title: "One", page: 0, children: [{ title: "One.a", page: 1, children: [] }] },
    { title: "Two", page: 2, children: [] },
  ];

  it("flattens depth-first with indent levels", () => {
    expect(flattenOutline(tree).map((x) => [x.title, x.depth])).toEqual([
      ["One", 0],
      ["One.a", 1],
      ["Two", 0],
    ]);
  });

  it("round-trips a tree through the flat form", () => {
    expect(buildOutlineTree(flattenOutline(tree))).toEqual(tree);
  });
});

describe("normalizeDepths", () => {
  it("forces the first entry to top level", () => {
    expect(normalizeDepths([b("x", 3)])[0]!.depth).toBe(0);
  });

  it("clamps a skipped level to one deeper than its predecessor", () => {
    expect(normalizeDepths([b("a", 0), b("b", 5)]).map((x) => x.depth)).toEqual([0, 1]);
  });

  it("leaves an already-valid sequence untouched", () => {
    const flat = [b("a", 0), b("b", 1), b("c", 2), b("d", 0)];
    expect(normalizeDepths(flat).map((x) => x.depth)).toEqual([0, 1, 2, 0]);
  });
});

describe("subtreeEnd", () => {
  it("spans all deeper entries that follow", () => {
    const flat = [b("a", 0), b("a1", 1), b("a1i", 2), b("c", 0)];
    expect(subtreeEnd(flat, 0)).toBe(3);
  });
});

describe("indentAt / outdentAt", () => {
  const flat = [b("a", 0), b("c", 0), b("c1", 1)];

  it("refuses to indent the first entry", () => {
    expect(indentAt(flat, 0)).toBe(flat);
  });

  it("indents an entry together with its children", () => {
    expect(indentAt(flat, 1).map((x) => x.depth)).toEqual([0, 1, 2]);
  });

  it("refuses to skip a level", () => {
    // "c1" is already one deeper than "c" — indenting again would skip.
    expect(indentAt(flat, 2)).toBe(flat);
  });

  it("outdents an entry together with its children", () => {
    const nested = [b("a", 0), b("a1", 1), b("a1i", 2)];
    expect(outdentAt(nested, 1).map((x) => x.depth)).toEqual([0, 0, 1]);
  });

  it("is a no-op at top level", () => {
    expect(outdentAt(flat, 0)).toBe(flat);
  });
});

describe("moveSubtree", () => {
  it("carries descendants along", () => {
    const flat = [b("a", 0), b("a1", 1), b("z", 0)];
    expect(moveSubtree(flat, 0, 3).map((x) => x.id)).toEqual(["z", "a", "a1"]);
  });

  it("treats a move into its own subtree as a no-op", () => {
    const flat = [b("a", 0), b("a1", 1), b("z", 0)];
    expect(moveSubtree(flat, 0, 1)).toBe(flat);
  });

  it("re-normalizes depth after a move to the front", () => {
    const flat = [b("a", 0), b("a1", 1)];
    expect(moveSubtree(flat, 1, 0).map((x) => x.depth)).toEqual([0, 0]);
  });
});

describe("validBookmarks", () => {
  it("drops blank titles and out-of-range pages, then re-normalizes", () => {
    const flat = [b("a", 0, 0, "  "), b("b", 1, 99), b("c", 2, 3, "Keep")];
    expect(validBookmarks(flat, 10)).toEqual([{ id: "c", title: "Keep", page: 3, depth: 0 }]);
  });
});
