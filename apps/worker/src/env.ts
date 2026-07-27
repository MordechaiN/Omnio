import { z } from "zod";

/**
 * The dev stores from `docker/compose.dev.yaml`, on Omnio's own ports
 * (docs/ports.md), so `pnpm dev` runs with nothing to copy or export first.
 * Refused in production — see apps/api/src/env.ts for the reasoning.
 */
const DEV_DATABASE_URL = "postgresql://omnio:omnio@localhost:7432/omnio";
const DEV_REDIS_URL = "redis://localhost:7479";

/**
 * Worker configuration. The worker owns no HTTP API — it takes jobs off the
 * queue and reads/writes storage and Postgres (docs/architecture/01-system-overview.md §3).
 */
const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    OMNIO_DATABASE_URL: z.string().url().default(DEV_DATABASE_URL),
    OMNIO_REDIS_URL: z.string().url().default(DEV_REDIS_URL),
    OMNIO_STORAGE_ROOT: z.string().default("./.omnio-data"),
    OMNIO_SCRATCH_TTL_HOURS: z.coerce.number().int().positive().default(24),
    OMNIO_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(4),
    OMNIO_WORKER_HEALTH_PORT: z.coerce.number().int().min(1).max(65535).default(7420),
    OMNIO_LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;
    for (const [key, devValue] of [
      ["OMNIO_DATABASE_URL", DEV_DATABASE_URL],
      ["OMNIO_REDIS_URL", DEV_REDIS_URL],
    ] as const) {
      if (env[key] === devValue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: "must be set in production (the local development default is refused).",
        });
      }
    }
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
