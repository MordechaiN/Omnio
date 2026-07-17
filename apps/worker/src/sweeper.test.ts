import type { PrismaClient } from "@omnio/db";
import type { StorageDriver } from "@omnio/storage";
import type { Logger } from "pino";
import { describe, expect, it, vi } from "vitest";
import { sweepExpired, type SweeperDeps } from "./sweeper.js";

function makeDeps(rows: { id: string; area: string; driverKey: string }[]): {
  deps: SweeperDeps;
  deleted: string[];
  storageDeletes: string[];
} {
  const deleted: string[] = [];
  const storageDeletes: string[] = [];
  let served = false;
  const prisma = {
    fileObject: {
      // First call returns the batch, subsequent calls return empty.
      findMany: vi.fn(() => {
        if (served) return Promise.resolve([]);
        served = true;
        return Promise.resolve(rows);
      }),
      delete: vi.fn((args: { where: { id: string } }) => {
        deleted.push(args.where.id);
        return Promise.resolve({});
      }),
    },
  } as unknown as PrismaClient;

  const storage = {
    delete: vi.fn((_area: string, key: string) => {
      storageDeletes.push(key);
      return Promise.resolve();
    }),
  } as unknown as StorageDriver;

  const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn() } as unknown as Logger;
  return { deps: { prisma, storage, logger }, deleted, storageDeletes };
}

describe("sweepExpired", () => {
  it("deletes storage bytes then the row for each expired object", async () => {
    const { deps, deleted, storageDeletes } = makeDeps([
      { id: "a", area: "scratch", driverKey: "KA" },
      { id: "b", area: "scratch", driverKey: "KB" },
    ]);
    const count = await sweepExpired(deps);
    expect(count).toBe(2);
    expect(storageDeletes).toEqual(["KA", "KB"]);
    expect(deleted).toEqual(["a", "b"]);
  });

  it("still removes the row when the storage delete fails (orphan)", async () => {
    const { deps, deleted } = makeDeps([{ id: "a", area: "scratch", driverKey: "KA" }]);
    (deps.storage.delete as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("gone"),
    );
    await sweepExpired(deps);
    expect(deleted).toEqual(["a"]);
    expect(deps.logger.warn).toHaveBeenCalled();
  });

  it("returns zero when nothing is expired", async () => {
    const { deps } = makeDeps([]);
    expect(await sweepExpired(deps)).toBe(0);
  });
});
