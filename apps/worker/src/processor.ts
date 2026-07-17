import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import type { FileObject, PrismaClient } from "@omnio/db";
import {
  JobPayloadSchema,
  publishProgress,
  type JobStatusValue,
  type ProgressEvent,
} from "@omnio/jobs";
import type { ToolInput, ToolOutput, WorkerContext, WorkerTool } from "@omnio/module-sdk";
import type { StorageArea, StorageDriver } from "@omnio/storage";
import type { Job as BullJob } from "bullmq";
import type { Redis } from "ioredis";
import type { Logger } from "pino";
import { createExec } from "./exec.js";

export interface ProcessorDeps {
  prisma: PrismaClient;
  storage: StorageDriver;
  publisher: Redis;
  ttlMs: number;
  logger: Logger;
  /** The modgen-generated worker tool registry (injected for testability). */
  tools: Record<string, WorkerTool<unknown>>;
}

function clamp(progress: number): number {
  return Math.min(100, Math.max(0, Math.round(progress)));
}

async function stageInputs(
  storage: StorageDriver,
  scratchDir: string,
  inputs: FileObject[],
): Promise<ToolInput[]> {
  const staged: ToolInput[] = [];
  for (const file of inputs) {
    const path = join(scratchDir, basename(file.originalName) || file.id);
    await writeFile(path, await storage.get(file.area as StorageArea, file.driverKey));
    staged.push({ path, mime: file.mime, originalName: file.originalName });
  }
  return staged;
}

async function persistOutputs(
  deps: ProcessorDeps,
  ownerId: string,
  jobId: string,
  outputs: readonly ToolOutput[],
): Promise<void> {
  for (const output of outputs) {
    const bytes = await readFile(output.path);
    const key = deps.storage.generateKey();
    const stat = await deps.storage.put("scratch", key, bytes);
    await deps.prisma.fileObject.create({
      data: {
        area: "scratch",
        driverKey: key,
        mime: output.mime,
        size: BigInt(stat.size),
        hash: createHash("sha256").update(bytes).digest("hex"),
        originalName: output.filename,
        ownerId,
        ttlAt: new Date(Date.now() + deps.ttlMs),
        jobOutputId: jobId,
      },
    });
  }
}

/**
 * Builds the BullMQ processor. Tools come from the generated registry; each job
 * gets an isolated scratch dir (deleted in `finally`), inputs are staged in and
 * outputs persisted out, and status/progress mirror to Postgres and the SSE
 * channel. Postgres stays the source of truth (docs/architecture/01-system-overview.md §3).
 */
export function createProcessor(deps: ProcessorDeps) {
  const emit = (event: ProgressEvent): Promise<number> => publishProgress(deps.publisher, event);

  return async (bullJob: BullJob): Promise<void> => {
    const { jobId } = JobPayloadSchema.parse(bullJob.data);
    const job = await deps.prisma.job.findUnique({
      where: { id: jobId },
      include: { inputs: true },
    });
    if (!job) {
      deps.logger.warn({ jobId }, "job row missing; dropping");
      return;
    }

    let lastProgress = 5;
    const setStatus = (status: JobStatusValue, error?: string): Promise<number> =>
      emit({ jobId, status, progress: lastProgress, error: error ?? null });

    await deps.prisma.job.update({
      where: { id: jobId },
      data: { status: "active", startedAt: new Date(), progress: 5, attempts: { increment: 1 } },
    });
    await setStatus("active");

    const scratchDir = await mkdtemp(join(tmpdir(), `omnio-job-${jobId}-`));
    try {
      const tool = deps.tools[`${job.moduleId}.${job.toolId}`];
      if (!tool) throw new Error(`Unknown worker tool: ${job.moduleId}.${job.toolId}`);

      const inputs = await stageInputs(deps.storage, scratchDir, job.inputs);
      const context: WorkerContext = {
        scratchDir,
        exec: createExec(scratchDir),
        onProgress: (percent) => {
          lastProgress = clamp(percent);
          void deps.prisma.job
            .update({ where: { id: jobId }, data: { progress: lastProgress } })
            .catch(() => undefined);
          void setStatus("active");
        },
        logger: {
          info: (message, fields) => deps.logger.info(fields ?? {}, message),
          warn: (message, fields) => deps.logger.warn(fields ?? {}, message),
          error: (message, fields) => deps.logger.error(fields ?? {}, message),
        },
        signal: new AbortController().signal,
      };

      const result = await tool.process({ id: jobId, options: job.options, inputs }, context);
      await persistOutputs(deps, job.ownerId, jobId, result.outputs);

      lastProgress = 100;
      await deps.prisma.job.update({
        where: { id: jobId },
        data: { status: "completed", progress: 100, finishedAt: new Date() },
      });
      await setStatus("completed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Job failed.";
      await deps.prisma.job
        .update({
          where: { id: jobId },
          data: { status: "failed", error: message, finishedAt: new Date() },
        })
        .catch(() => undefined);
      await setStatus("failed", message).catch(() => undefined);
      deps.logger.error({ jobId, err: message }, "job failed");
      throw error;
    } finally {
      await rm(scratchDir, { recursive: true, force: true }).catch(() => undefined);
    }
  };
}
