import type { PrismaClient } from "@omnio/db";
import type { StorageDriver } from "@omnio/storage";
import type { Job as BullJob } from "bullmq";
import type { Redis } from "ioredis";
import type { Logger } from "pino";
import { describe, expect, it, vi } from "vitest";
import { createProcessor, type ProcessorDeps } from "./processor";

interface FakeJobRow {
  id: string;
  moduleId: string;
  toolId: string;
  ownerId: string;
  inputs: unknown[];
}

function makeDeps(job: FakeJobRow | null): {
  deps: ProcessorDeps;
  updates: Record<string, unknown>[];
  published: string[];
} {
  const updates: Record<string, unknown>[] = [];
  const published: string[] = [];
  const prisma = {
    job: {
      findUnique: vi.fn().mockResolvedValue(job),
      update: vi.fn((args: { data: Record<string, unknown> }) => {
        updates.push(args.data);
        return Promise.resolve({});
      }),
    },
    fileObject: { create: vi.fn().mockResolvedValue({}) },
  } as unknown as PrismaClient;

  const publisher = {
    publish: vi.fn((_channel: string, payload: string) => {
      published.push(payload);
      return Promise.resolve(1);
    }),
  } as unknown as Redis;

  const storage = {} as StorageDriver;
  const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn() } as unknown as Logger;

  return { deps: { prisma, storage, publisher, ttlMs: 1000, logger }, updates, published };
}

const bullJob = (jobId: string): BullJob => ({ data: { jobId } }) as unknown as BullJob;

describe("createProcessor", () => {
  it("completes a core.echo job with no inputs", async () => {
    const { deps, updates, published } = makeDeps({
      id: "j1",
      moduleId: "core",
      toolId: "echo",
      ownerId: "u1",
      inputs: [],
    });
    await createProcessor(deps)(bullJob("j1"));
    expect(updates.at(-1)).toMatchObject({ status: "completed", progress: 100 });
    expect(published.some((p) => p.includes('"status":"completed"'))).toBe(true);
  });

  it("fails an unknown tool and records the error", async () => {
    const { deps, updates } = makeDeps({
      id: "j2",
      moduleId: "ghost",
      toolId: "nope",
      ownerId: "u1",
      inputs: [],
    });
    await expect(createProcessor(deps)(bullJob("j2"))).rejects.toThrow(/Unknown tool/);
    expect(updates.some((u) => u.status === "failed")).toBe(true);
  });

  it("drops a job whose row is gone", async () => {
    const { deps, updates } = makeDeps(null);
    await createProcessor(deps)(bullJob("missing"));
    expect(updates).toHaveLength(0);
  });
});
