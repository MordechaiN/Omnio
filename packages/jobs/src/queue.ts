import { Redis } from "ioredis";

/** The single worker-tier job queue (docs/architecture/01-system-overview.md §3). */
export const OMNIO_JOB_QUEUE = "omnio.jobs";

/** The BullMQ job name within the queue. */
export const OMNIO_JOB_NAME = "run";

/** Maintenance queue for scheduled housekeeping (the TTL sweeper). */
export const OMNIO_MAINTENANCE_QUEUE = "omnio.maintenance";

/** Repeatable sweep job name and scheduler id. */
export const OMNIO_SWEEP_JOB = "sweep";

/**
 * A Redis connection wired for BullMQ. `maxRetriesPerRequest: null` is required
 * by BullMQ's blocking consumers; producer and consumer each get their own.
 */
export function createJobsConnection(redisUrl: string): Redis {
  return new Redis(redisUrl, { maxRetriesPerRequest: null });
}
