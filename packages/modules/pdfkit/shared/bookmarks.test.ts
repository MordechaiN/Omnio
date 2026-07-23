import { describe, expect, it } from "vitest";
import { bookmarkRanges } from "./bookmarks.ts";

describe("bookmarkRanges", () => {
  it("splits pages into ranges bounded by the next bookmark", () => {
    const r = bookmarkRanges([{ title: "Intro", page: 0 }, { title: "Body", page: 2 }, { title: "End", page: 5 }], 8);
    expect(r).toEqual([
      { title: "Intro", start: 0, end: 1 },
      { title: "Body", start: 2, end: 4 },
      { title: "End", start: 5, end: 7 },
    ]);
  });

  it("ignores bookmarks past the last page and clamps", () => {
    const r = bookmarkRanges([{ title: "A", page: 0 }, { title: "Bad", page: 99 }], 3);
    expect(r).toEqual([{ title: "A", start: 0, end: 2 }]);
  });

  it("returns nothing when there are no usable bookmarks", () => {
    expect(bookmarkRanges([], 5)).toEqual([]);
  });
});
