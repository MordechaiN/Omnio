/**
 * Slugify — URL-safe slugs, on-device. Latin text is transliterated by
 * stripping diacritics (NFD + combining-mark removal); non-Latin scripts are
 * kept as-is when Unicode slugs are requested, otherwise dropped.
 */

export interface SlugOptions {
  separator: string;
  lowercase: boolean;
  /** Keep Unicode letters (e.g. Hebrew) instead of stripping to ASCII. */
  allowUnicode: boolean;
}

export const DEFAULT_SLUG_OPTIONS: SlugOptions = {
  separator: "-",
  lowercase: true,
  allowUnicode: false,
};

export function slugify(input: string, options: SlugOptions = DEFAULT_SLUG_OPTIONS): string {
  let text = input.normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (options.lowercase) text = text.toLowerCase();

  const wordChars = options.allowUnicode ? /[^\p{L}\p{N}]+/gu : /[^a-zA-Z0-9]+/g;
  const separator = options.separator || "-";

  return text
    .replace(wordChars, " ")
    .trim()
    .replace(/\s+/g, separator);
}
