/**
 * Reading an archive without opening it.
 *
 * Everything here works from the zip's central directory — the table of
 * contents every archive carries — so nothing is ever decompressed. That is not
 * only a speed trick: inflating an archive to describe it is exactly how a small
 * crafted file takes a browser down, and Omnio already refuses to do it on drop.
 * The same restraint is what makes this tool honest about a 40 GB archive
 * instead of dying while trying to measure one.
 */

export interface ArchiveEntry {
  name: string;
  /** Bytes this entry occupies inside the archive. */
  packed: number;
  /** Bytes it would occupy once written out. */
  unpacked: number;
}

export interface ArchiveSummary {
  fileCount: number;
  folderCount: number;
  packedBytes: number;
  unpackedBytes: number;
  /** 0.25 means "a quarter of the original size". Null when nothing to compare. */
  ratio: number | null;
  /** Largest entries once unpacked, biggest first. */
  largest: ArchiveEntry[];
  /** Entries whose names would escape the folder you extract into. */
  unsafe: string[];
  /** Entries stored with no compression at all — usually already-compressed media. */
  storedCount: number;
}

const isFolder = (name: string): boolean => name.endsWith("/");

/**
 * A name is unsafe when extracting it would write outside the destination:
 * absolute paths, drive letters, or any `..` segment. Omnio never extracts on
 * this screen, but someone deciding whether to trust an archive deserves to
 * know it contains names like these before they open it elsewhere.
 */
export function isUnsafeName(name: string): boolean {
  if (name.startsWith("/") || name.startsWith("\\")) return true;
  if (/^[a-zA-Z]:[\\/]/.test(name)) return true;
  return name
    .split(/[\\/]/)
    .some((segment) => segment === "..");
}

export function summarize(entries: ArchiveEntry[]): ArchiveSummary {
  const files = entries.filter((entry) => !isFolder(entry.name));
  const packedBytes = files.reduce((total, entry) => total + entry.packed, 0);
  const unpackedBytes = files.reduce((total, entry) => total + entry.unpacked, 0);

  return {
    fileCount: files.length,
    folderCount: entries.filter((entry) => isFolder(entry.name)).length,
    packedBytes,
    unpackedBytes,
    ratio: unpackedBytes > 0 ? packedBytes / unpackedBytes : null,
    largest: [...files].sort((a, b) => b.unpacked - a.unpacked).slice(0, 8),
    unsafe: files.filter((entry) => isUnsafeName(entry.name)).map((entry) => entry.name),
    // `packed === unpacked` means the entry was stored verbatim. Common and
    // harmless — photos and video are already compressed — and worth showing so
    // nobody wonders why zipping their holiday pictures saved nothing.
    storedCount: files.filter((entry) => entry.packed === entry.unpacked && entry.unpacked > 0)
      .length,
  };
}

/** Top-level folder names, in the order they first appear. */
export function topLevelFolders(entries: ArchiveEntry[]): string[] {
  const seen = new Set<string>();
  for (const entry of entries) {
    const [head] = entry.name.split("/");
    if (head && entry.name.includes("/")) seen.add(head);
  }
  return [...seen];
}
