import { z } from "zod";

/**
 * Everything the worker needs is looked up from Postgres by `jobId` — the queue
 * is transport, never the source of truth. `requestId` propagates the api's
 * request id into worker logs for end-to-end correlation.
 */
export const JobPayloadSchema = z.object({
  jobId: z.string(),
  requestId: z.string().optional(),
});
export type JobPayload = z.infer<typeof JobPayloadSchema>;
