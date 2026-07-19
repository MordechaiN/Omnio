/**
 * Zip entry helpers — pure and testable. Sanitization guards against
 * zip-slip-style names when a browser download is triggered: absolute paths
 * and parent traversals collapse to a safe basename-ish form.
 */

/** Safe display/download name for a zip entry. Returns null for directories. */
export function sanitizeEntryName(rawName: string): string | null {
  if (rawName.endsWith("/")) return null; // directory entry
  const parts = rawName
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part !== "" && part !== "." && part !== "..");
  if (parts.length === 0) return null;
  return parts.join("/");
}

/** Basename for the browser's save dialog. */
export function downloadName(sanitized: string): string {
  return sanitized.split("/").at(-1) ?? sanitized;
}

/** "photos" + n files → "photos.zip"; empty falls back to archive.zip. */
export function archiveName(base: string): string {
  const trimmed = base.trim().replace(/\.zip$/i, "");
  return `${trimmed === "" ? "archive" : trimmed}.zip`;
}
