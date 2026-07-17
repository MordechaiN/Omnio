import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { generateObjectKey, isValidObjectKey } from "./keys";
import type { StorageArea, StorageDriver, StoredObjectStat } from "./types";

const AREAS: readonly StorageArea[] = ["scratch", "workspace"];

export interface FsStorageConfig {
  /** Absolute or cwd-relative root; `scratch/` and `workspace/` live beneath. */
  root: string;
}

/**
 * Local-filesystem storage driver (driver #1). Objects are sharded by the first
 * two key characters to keep directories shallow; writes are staged to a temp
 * file and atomically renamed so a crash never leaves a partial object.
 */
export class FsStorageDriver implements StorageDriver {
  constructor(private readonly config: FsStorageConfig) {}

  generateKey(): string {
    return generateObjectKey();
  }

  async put(area: StorageArea, key: string, data: Readable | Buffer): Promise<StoredObjectStat> {
    const target = this.pathFor(area, key);
    await mkdir(dirname(target), { recursive: true });
    const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
    const source = Buffer.isBuffer(data) ? Readable.from(data) : data;
    try {
      await pipeline(source, createWriteStream(temp, { mode: 0o600 }));
      await rename(temp, target);
    } catch (error) {
      await rm(temp, { force: true });
      throw error;
    }
    const info = await stat(target);
    return { area, key, size: info.size, createdAt: info.birthtime };
  }

  async get(area: StorageArea, key: string): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of await this.stream(area, key)) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
  }

  async stream(area: StorageArea, key: string): Promise<Readable> {
    const path = this.pathFor(area, key);
    await stat(path); // surface a missing object before the stream opens
    return createReadStream(path);
  }

  async delete(area: StorageArea, key: string): Promise<void> {
    await rm(this.pathFor(area, key), { force: true });
  }

  async stat(area: StorageArea, key: string): Promise<StoredObjectStat | null> {
    try {
      const info = await stat(this.pathFor(area, key));
      return { area, key, size: info.size, createdAt: info.birthtime };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async *list(area: StorageArea): AsyncIterable<StoredObjectStat> {
    const base = join(this.config.root, area);
    let shards: string[];
    try {
      shards = await readdir(base);
    } catch (error) {
      if (isNotFound(error)) return;
      throw error;
    }
    for (const shard of shards) {
      const entries = await readdir(join(base, shard)).catch(() => [] as string[]);
      for (const key of entries) {
        if (!isValidObjectKey(key)) continue;
        const info = await this.stat(area, key);
        if (info) yield info;
      }
    }
  }

  private pathFor(area: StorageArea, key: string): string {
    if (!AREAS.includes(area)) {
      throw new Error(`Unknown storage area: ${area}`);
    }
    if (!isValidObjectKey(key)) {
      throw new Error("Invalid storage key.");
    }
    return join(this.config.root, area, key.slice(0, 2), key);
  }
}

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === "ENOENT";
}
