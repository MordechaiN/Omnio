/**
 * The platform categories — stable IDs, in display order.
 * Names and blurbs live in the i18n catalogs (categories.<id>.*); a test in
 * @omnio/i18n keeps catalogs and this list in lockstep. Modules declare one
 * of these IDs in their manifest (docs/architecture/03-module-system.md).
 */
export const CATEGORY_IDS = [
  "images",
  "pdf",
  "video",
  "audio",
  "office",
  "text",
  "developer",
  "finance",
  "security",
  "utilities",
  "ai",
  "archives",
  "networking",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export function isCategoryId(value: string): value is CategoryId {
  return (CATEGORY_IDS as readonly string[]).includes(value);
}
