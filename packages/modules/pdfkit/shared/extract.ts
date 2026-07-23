/**
 * Pure naming helpers for the extract tools — kept out of the engine code so
 * they're unit-testable. The mupdf walk that produces the actual bytes lives in
 * `frontend/lib/mupdf.ts`.
 */

/** Filename for the Nth extracted image, zero-padded and stable for zipping. */
export function imageEntryName(base: string, ordinal: number, ext: string): string {
  const stem = base.replace(/\.pdf$/i, "") || "document";
  return `${stem}-image-${String(ordinal).padStart(3, "0")}.${ext}`;
}
