import type { Readable } from "node:stream";

/**
 * The two storage areas (docs/architecture/01-system-overview.md §4):
 * `scratch` holds uploads and job outputs (TTL-swept); `workspace` holds files
 * the user explicitly kept.
 */
export type StorageArea = "scratch" | "workspace";

export interface StoredObjectStat {
  area: StorageArea;
  key: string;
  size: number;
  createdAt: Date;
}

/**
 * Streaming-first byte store. Keys are opaque and generated — never derived
 * from filenames (docs/architecture/06-security.md §3). Object metadata
 * (owner, MIME, TTL) lives in the `FileObject` table, not here. S3/MinIO is a
 * future implementation of this same interface, not a refactor.
 */
export interface StorageDriver {
  /** Mint a fresh opaque key for a new object in an area. */
  generateKey(): string;
  put(area: StorageArea, key: string, data: Readable | Buffer): Promise<StoredObjectStat>;
  get(area: StorageArea, key: string): Promise<Buffer>;
  stream(area: StorageArea, key: string): Promise<Readable>;
  delete(area: StorageArea, key: string): Promise<void>;
  stat(area: StorageArea, key: string): Promise<StoredObjectStat | null>;
  list(area: StorageArea): AsyncIterable<StoredObjectStat>;
}
