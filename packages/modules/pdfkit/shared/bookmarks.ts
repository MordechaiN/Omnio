/**
 * Pure page-range math for split-by-bookmarks — kept out of the engine code so
 * it's unit-testable. Each top-level bookmark starts a section that runs until
 * the next bookmark's page (or the end of the document).
 */

export interface BookmarkPage {
  title: string;
  /** Zero-based page index the bookmark points at. */
  page: number;
}

export interface BookmarkRange {
  title: string;
  start: number;
  end: number;
}

export function bookmarkRanges(bookmarks: BookmarkPage[], totalPages: number): BookmarkRange[] {
  const valid = bookmarks
    .filter((b) => Number.isInteger(b.page) && b.page >= 0 && b.page < totalPages)
    .sort((a, b) => a.page - b.page);
  const ranges: BookmarkRange[] = [];
  for (let i = 0; i < valid.length; i += 1) {
    const start = valid[i]!.page;
    const end = (i + 1 < valid.length ? valid[i + 1]!.page : totalPages) - 1;
    if (end >= start) ranges.push({ title: valid[i]!.title, start, end });
  }
  return ranges;
}
