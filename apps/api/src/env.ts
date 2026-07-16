import { z } from "zod";

/**
 * Boot-time configuration. Invalid config refuses startup with a message
 * naming exactly what's wrong (docs/architecture/01-system-overview.md §7,
 * docs/architecture/06-security.md §5). Secrets arrive only through the
 * environment — never the database, never the client.
 */
const DEV_SESSION_SECRET = "omnio-development-session-secret-change-me";

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    OMNIO_API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    OMNIO_API_HOST: z.string().default("0.0.0.0"),

    OMNIO_DATABASE_URL: z.string().url(),
    OMNIO_REDIS_URL: z.string().url(),

    /** Authentication posture (decision D2). */
    OMNIO_AUTH: z.enum(["password", "none"]).default("password"),
    /** Required in production; a loud dev default keeps first-run friction low. */
    OMNIO_SESSION_SECRET: z.string().min(32).default(DEV_SESSION_SECRET),
    /** Permit `OMNIO_AUTH=none` on a non-local bind. Off by default. */
    OMNIO_AUTH_ALLOW_INSECURE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),

    /** Root of the local filesystem storage driver. */
    OMNIO_STORAGE_ROOT: z.string().default("./.omnio-data"),
    /** Scratch retention before the sweeper reclaims it (decision D3). */
    OMNIO_SCRATCH_TTL_HOURS: z.coerce.number().int().positive().default(24),
    /** Session lifetime; login rotates the token and resets this window. */
    OMNIO_SESSION_TTL_HOURS: z.coerce.number().int().positive().default(168),

    OMNIO_LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && env.OMNIO_SESSION_SECRET === DEV_SESSION_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["OMNIO_SESSION_SECRET"],
        message: "must be set to a strong secret in production (the dev default is refused).",
      });
    }
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
