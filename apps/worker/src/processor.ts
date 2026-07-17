import type { FileObject, Job, PrismaClient } from "@omnio/db";
import {
  JobPayloadSchema,
  publishProgress,
  type JobStatusValue,
  type ProgressEvent,
} from "@omnio/jobs";
import type { StorageDriver } from "@omnio/storage";
import type { Job as BullJob } from "bullmq";
import type { Redis } from "ioredis";
import type { Logger } from "pino";

export interface ProcessorDeps {
  prisma: PrismaClient;
  storage: StorageDriver;
  publisher: Redis;
  ttlMs: number;
  logger: Logger;
}

type JobWithInputs = Job & { inputs: FileObject[] };

interface ToolContext {
  job: JobWithInputs;
  deps: ProcessorDeps;
  report: (progress: number) => Promise<void>;
}

type BuiltinTool = (ctx: ToolContext) => Promise<void>;

/**
 * The single builtin proving the whole worker path end to end: it copies each
 * input into a fresh scratch output owned by the job. Real modules register
 * their tools through the module system in M4.
 */
const echoTool: BuiltinTool = async ({ job, deps, report }) => {
  if (job.inputs.length === 0) {
    await report(50);
    return;
  }
  let done = 0;
  for (const input of job.inputs) {
    const outKey = deps.storage.generateKey();
    const stat = await deps.storage.put(
      "scratch",
      outKey,
      await deps.storage.stream(input.area, input.driverKey),
    );
    await deps.prisma.fileObject.create({
      data: {
        area: "scratch",
        driverKey: outKey,
        mime: input.mime,
        size: BigInt(stat.size),
        hash: input.hash,
        originalName: `echo-${input.originalName}`,
        ownerId: job.ownerId,
        ttlAt: new Date(Date.now() + deps.ttlMs),
        jobOutputId: job.id,
      },
    });
    done += 1;
    await report(5 + Math.round((done / job.inputs.length) * 90));
  }
};

const BUILTINS: Record<string, BuiltinTool> = {
  "core.echo": echoTool,
};

function clamp(progress: number): number {
  return Math.min(100, Math.max(0, Math.round(progress)));
}

/**
 * Builds the BullMQ processor. Postgres is the source of truth for job state;
 * progress is mirrored to the Redis channel the api relays over SSE.
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
    const setStatus = async (status: JobStatusValue, error?: string): Promise<void> => {
      await emit({ jobId, status, progress: lastProgress, error: error ?? null });
    };

    await deps.prisma.job.update({
      where: { id: jobId },
      data: { status: "active", startedAt: new Date(), progress: 5, attempts: { increment: 1 } },
    });
    await setStatus("active");

    try {
      const tool = BUILTINS[`${job.moduleId}.${job.toolId}`];
      if (!tool) throw new Error(`Unknown tool: ${job.moduleId}.${job.toolId}`);

      await tool({
        job,
        deps,
        report: async (progress) => {
          lastProgress = clamp(progress);
          await deps.prisma.job.update({ where: { id: jobId }, data: { progress: lastProgress } });
          await setStatus("active");
        },
      });

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
    }
  };
}
