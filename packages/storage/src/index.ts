import { FsStorageDriver, type FsStorageConfig } from "./fs-driver";
import type { StorageDriver } from "./types";

export type { StorageArea, StorageDriver, StoredObjectStat } from "./types";
export { FsStorageDriver, type FsStorageConfig } from "./fs-driver";
export { generateObjectKey, isValidObjectKey } from "./keys";

/**
 * Build the configured storage driver. Only the local-filesystem driver exists
 * in v1; S3/MinIO plugs in here behind the same interface (post-v1).
 */
export function createStorageDriver(config: FsStorageConfig): StorageDriver {
  return new FsStorageDriver(config);
}
