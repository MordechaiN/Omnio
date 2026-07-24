/**
 * Content-addressed blob storage on OPFS.
 *
 * Files are stored under `blobs/<aa>/<hash>` — sharded by the first two hex
 * characters, because a single directory holding thousands of entries is slow
 * to enumerate in every implementation. The path derives entirely from the
 * content hash, so importing the same bytes twice writes once and every
 * duplicate is free.
 */

const ROOT_DIR = "blobs";

export function isOpfsAvailable(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.storage?.getDirectory === "function" &&
    typeof FileSystemFileHandle !== "undefined"
  );
}

async function shardDir(hash: string, create: boolean): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  const blobs = await root.getDirectoryHandle(ROOT_DIR, { create });
  return blobs.getDirectoryHandle(hash.slice(0, 2), { create });
}

/** Compute the SHA-256 of the bytes, as lowercase hex. */
export async function hashBytes(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hasBlob(hash: string): Promise<boolean> {
  try {
    const dir = await shardDir(hash, false);
    await dir.getFileHandle(hash);
    return true;
  } catch {
    return false;
  }
}

/**
 * Write bytes under their hash. A second write of identical content is skipped
 * rather than repeated — this is what makes duplicate import free.
 */
export async function putBlob(hash: string, data: Blob): Promise<void> {
  if (await hasBlob(hash)) return;
  const dir = await shardDir(hash, true);
  const handle = await dir.getFileHandle(hash, { create: true });
  const writable = await handle.createWritable();
  try {
    await writable.write(data);
  } finally {
    await writable.close();
  }
}

/**
 * Read the content back as a real `File`.
 *
 * Handing back a `File` rather than a custom type is the reason ~100 existing
 * tools need no changes: they already accept `File` from a drop zone and cannot
 * tell the difference.
 */
export async function getBlobAsFile(hash: string, name: string, mime: string): Promise<File | null> {
  try {
    const dir = await shardDir(hash, false);
    const handle = await dir.getFileHandle(hash);
    const stored = await handle.getFile();
    return new File([stored], name, { type: mime, lastModified: stored.lastModified });
  } catch {
    return null;
  }
}

/** Remove the content. Callers must ensure no other row references the hash. */
export async function deleteBlob(hash: string): Promise<void> {
  try {
    const dir = await shardDir(hash, false);
    await dir.removeEntry(hash);
  } catch {
    // Already gone — deleting is idempotent by intent.
  }
}

export interface StorageEstimate {
  usage: number;
  quota: number;
}

export async function estimateStorage(): Promise<StorageEstimate | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}

/**
 * Ask the browser not to evict the workspace under storage pressure. Best
 * effort: a refusal is not an error, but the caller should treat the workspace
 * as a cache either way.
 */
export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
