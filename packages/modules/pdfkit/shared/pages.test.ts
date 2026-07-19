import { describe, expect, it } from "vitest";
import { parsePageRanges, pdfFilename, remainingPages } from "./pages.ts";

describe("parsePageRanges", () => {
  it("parses singles, ranges, and open ranges", () => {
    expect(parsePageRanges("1-3,7", 10)).toEqual([0, 1, 2, 6]);
    expect(parsePageRanges("8-", 10)).toEqual([7, 8, 9]);
    expect(parsePageRanges("5", 10)).toEqual([4]);
  });

  it("de-duplicates and sorts overlapping input", () => {
    expect(parsePageRanges("3,1-4,2", 10)).toEqual([0, 1, 2, 3]);
  });

  it("tolerates whitespace", () => {
    expect(parsePageRanges(" 1 - 2 , 4 ", 5)).toEqual([0, 1, 3]);
  });

  it("rejects malformed or out-of-bounds input", () => {
    expect(parsePageRanges("", 10)).toBeNull();
    expect(parsePageRanges("0", 10)).toBeNull();
    expect(parsePageRanges("11", 10)).toBeNull();
    expect(parsePageRanges("5-2", 10)).toBeNull();
    expect(parsePageRanges("1-11", 10)).toBeNull();
    expect(parsePageRanges("abc", 10)).toBeNull();
    expect(parsePageRanges("1,,2", 10)).toBeNull();
    expect(parsePageRanges("1", 0)).toBeNull();
  });
});

describe("remainingPages", () => {
  it("returns the complement in order", () => {
    expect(remainingPages([0, 2], 5)).toEqual([1, 3, 4]);
    expect(remainingPages([], 3)).toEqual([0, 1, 2]);
    expect(remainingPages([0, 1, 2], 3)).toEqual([]);
  });
});

describe("pdfFilename", () => {
  it("replaces the extension case-insensitively", () => {
    expect(pdfFilename("report.PDF", "split")).toBe("report-split.pdf");
    expect(pdfFilename("scan", "rotated")).toBe("scan-rotated.pdf");
    expect(pdfFilename(".pdf", "merged")).toBe("document-merged.pdf");
  });
});
