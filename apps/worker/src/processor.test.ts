import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PrismaClient } from "@omnio/db";
import type { WorkerTool } from "@omnio/module-sdk";
import type { StorageDriver } from "@omnio/storage";
import type { Job as BullJob } from "bullmq";
import type { Redis } from "ioredis";
import type { Logger } from "pino";
import { describe, expect, it, vi } from "vitest";
import { createProcessor, type ProcessorDeps } from "./processor.js";

interface FakeJobRow {
  id: string;
  moduleId: string;
  toolId: string;
  ownerId: string;
  options: unknown;
  inputs: unknown[];
}

const echoTool: WorkerTool<unknown> = {
  async process(_job, ctx) {
    const path = join(ctx.scratchDir, "out.txt");
    await writeFile(path, "DONE");
    return { outputs: [{ path, mime: "text/plain", filename: "out.txt" }] };
  },
};

function makeDeps(
  job: FakeJobRow | null,
  tools: Record<string, WorkerTool<unknown>>,
): { deps: ProcessorDeps; updates: Record<string, unknown>[]; created: () => number } {
  const updates: Record<string, unknown>[] = [];
  const state = { created: 0 };
  const prisma = {
    job: {
      findUnique: vi.fn().mockResolvedValue(job),
      update: vi.fn((args: { data: Record<string, unknown> }) => {
        updates.push(args.data);
        return Promise.resolve({});
      }),
    },
    fileObject: {
      create: vi.fn(() => {
        state.created += 1;
        return Promise.resolve({});
      }),
    },
  } as unknown as PrismaClient;

  const storage = {
    generateKey: () => "0123456789ABCDEFGHJKMNPQRS",
    put: vi.fn().mockResolvedValue({ size: 4 }),
    get: vi.fn(),
  } as unknown as StorageDriver;

  const publisher = { publish: vi.fn().mockResolvedValue(1) } as unknown as Redis;
  const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn() } as unknown as Logger;

  return {
    deps: { prisma, storage, publisher, ttlMs: 1000, logger, tools },
    updates,
    created: () => state.created,
  };
}

const bullJob = (jobId: string): BullJob => ({ data: { jobId } }) as unknown as BullJob;

const jobRow = (over: Partial<FakeJobRow> = {}): FakeJobRow => ({
  id: "j1",
  moduleId: "test",
  toolId: "echo",
  ownerId: "u1",
  options: {},
  inputs: [],
  ...over,
});

describe("createProcessor", () => {
  it("runs a registered tool and persists its outputs", async () => {
    const h = makeDeps(jobRow(), { "test.echo": echoTool });
    await createProcessor(h.deps)(bullJob("j1"));
    expect(h.updates.at(-1)).toMatchObject({ status: "completed", progress: 100 });
    expect(h.created()).toBe(1);
  });

  it("fails an unknown tool and records the error", async () => {
    const h = makeDeps(jobRow({ moduleId: "ghost", toolId: "nope" }), {});
    await expect(createProcessor(h.deps)(bullJob("j1"))).rejects.toThrow(/Unknown worker tool/);
    expect(h.updates.some((u) => u.status === "failed")).toBe(true);
  });

  it("drops a job whose row is gone", async () => {
    const h = makeDeps(null, {});
    await createProcessor(h.deps)(bullJob("missing"));
    expect(h.updates).toHaveLength(0);
  });
});
