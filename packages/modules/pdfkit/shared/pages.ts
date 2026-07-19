/**
 * Page-range parsing for the PDF tools. Ranges are 1-based, comma-separated:
 * "1-3,7,9-" — a trailing open range runs to the last page. Returns sorted,
 * de-duplicated zero-based indices, or null when the text is malformed or
 * out of bounds.
 */
export function parsePageRanges(text: string, pageCount: number): number[] | null {
  if (pageCount < 1) return null;
  const indices = new Set<number>();
  const trimmed = text.trim();
  if (trimmed === "") return null;

  for (const part of trimmed.split(",")) {
    const token = part.trim();
    const match = /^(\d+)(?:\s*-\s*(\d*))?$/.exec(token);
    if (!match) return null;
    const start = Number(match[1]);
    const end =
      match[2] === undefined ? start : match[2] === "" ? pageCount : Number(match[2]);
    if (start < 1 || end > pageCount || start > end) return null;
    for (let page = start; page <= end; page += 1) indices.add(page - 1);
  }
  return [...indices].sort((a, b) => a - b);
}

/** The complement of a selection — the pages that remain after deletion. */
export function remainingPages(deleted: number[], pageCount: number): number[] {
  const gone = new Set(deleted);
  const kept: number[] = [];
  for (let i = 0; i < pageCount; i += 1) if (!gone.has(i)) kept.push(i);
  return kept;
}

/** "photo.pdf" → "photo-suffix.pdf" */
export function pdfFilename(inputName: string, suffix: string): string {
  const base = inputName.replace(/\.pdf$/i, "") || "document";
  return `${base}-${suffix}.pdf`;
}
