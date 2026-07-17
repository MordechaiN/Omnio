import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FsStorageDriver } from "./fs-driver";

let root: string;
let driver: FsStorageDriver;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "omnio-storage-"));
  driver = new FsStorageDriver({ root });
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("FsStorageDriver", () => {
  it("round-trips a buffer and reports size", async () => {
    const key = driver.generateKey();
    const stat = await driver.put("scratch", key, Buffer.from("hello omnio"));
    expect(stat.size).toBe(11);
    expect((await driver.get("scratch", key)).toString()).toBe("hello omnio");
  });

  it("round-trips a stream", async () => {
    const key = driver.generateKey();
    await driver.put("workspace", key, Readable.from(["chunk-a", "chunk-b"]));
    expect((await driver.get("workspace", key)).toString()).toBe("chunk-achunk-b");
  });

  it("returns null stat for a missing object and lists stored ones", async () => {
    const key = driver.generateKey();
    expect(await driver.stat("scratch", key)).toBeNull();
    await driver.put("scratch", key, Buffer.from("x"));
    const keys: string[] = [];
    for await (const object of driver.list("scratch")) keys.push(object.key);
    expect(keys).toContain(key);
  });

  it("deletes idempotently", async () => {
    const key = driver.generateKey();
    await driver.put("scratch", key, Buffer.from("y"));
    await driver.delete("scratch", key);
    await driver.delete("scratch", key);
    expect(await driver.stat("scratch", key)).toBeNull();
  });

  it("rejects a malformed key", async () => {
    await expect(driver.get("scratch", "../etc/passwd")).rejects.toThrow(/Invalid storage key/);
  });
});
