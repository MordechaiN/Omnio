import { z } from "zod";

/**
 * Worker configuration. The worker owns no HTTP API — it takes jobs off the
 * queue and reads/writes storage and Postgres (docs/architecture/01-system-overview.md §3).
 */
const EnvSchema = z.object({
  OMNIO_DATABASE_URL: z.string().url(),
  OMNIO_REDIS_URL: z.string().url(),
  OMNIO_STORAGE_ROOT: z.string().default("./.omnio-data"),
  OMNIO_SCRATCH_TTL_HOURS: z.coerce.number().int().positive().default(24),
  OMNIO_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(4),
  OMNIO_WORKER_HEALTH_PORT: z.coerce.number().int().min(1).max(65535).default(4100),
  OMNIO_LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid worker configuration:\n${detail}`);
  }
  return result.data;
}
