import type { Redis } from "ioredis";
import { z } from "zod";

export const JobStatusSchema = z.enum(["queued", "active", "completed", "failed", "canceled"]);
export type JobStatusValue = z.infer<typeof JobStatusSchema>;

export const TERMINAL_STATUSES: ReadonlySet<JobStatusValue> = new Set([
  "completed",
  "failed",
  "canceled",
]);

/** Progress/status update streamed to the client over SSE. */
export const ProgressEventSchema = z.object({
  jobId: z.string(),
  status: JobStatusSchema,
  progress: z.number().int().min(0).max(100),
  error: z.string().nullable().optional(),
});
export type ProgressEvent = z.infer<typeof ProgressEventSchema>;

/** Redis pub/sub channel the worker publishes to and the api SSE endpoint reads. */
export function jobProgressChannel(jobId: string): string {
  return `omnio:job:${jobId}`;
}

export function publishProgress(publisher: Redis, event: ProgressEvent): Promise<number> {
  return publisher.publish(jobProgressChannel(event.jobId), JSON.stringify(event));
}
