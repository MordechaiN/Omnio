import { z } from "zod";

/**
 * Boot-time configuration. Invalid config refuses startup with a message
 * naming exactly what's wrong (docs/architecture/01-system-overview.md §7).
 * Grows in M3 (database, redis, auth); only what M1 uses lives here now.
 */
const EnvSchema = z.object({
  OMNIO_API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${detail}`);
  }
  return result.data;
}
