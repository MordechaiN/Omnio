import { z } from "zod";

/**
 * Boot-time configuration. Invalid config refuses startup with a message
 * naming exactly what's wrong (docs/architecture/01-system-overview.md §7,
 * docs/architecture/06-security.md §5). Secrets arrive only through the
 * environment — never the database, never the client.
 */
const DEV_SESSION_SECRET = "omnio-development-session-secret-change-me";

/**
 * Secrets that appear in the repo (dev default, .env.example placeholder) are
 * public knowledge — refuse them in production so a copied-but-unedited config
 * can never ship a forgeable session secret.
 */
const PUBLIC_SESSION_SECRETS = new Set([
  DEV_SESSION_SECRET,
  "change-me-to-a-long-random-secret-value",
]);

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    OMNIO_API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    OMNIO_API_HOST: z.string().default("0.0.0.0"),

    OMNIO_DATABASE_URL: z.string().url(),
    OMNIO_REDIS_URL: z.string().url(),

    /** Deployment mode (decision D2, reversed 2026-07-18): "personal" is a
     * single implicit local user with no login; "multi-user" is the original
     * single-admin-account-with-password model. */
    OMNIO_MODE: z.enum(["personal", "multi-user"]).default("personal"),
    /** Required in production; a loud dev default keeps first-run friction low. */
    OMNIO_SESSION_SECRET: z.string().min(32).default(DEV_SESSION_SECRET),
    /** Permit `OMNIO_MODE=personal` on a non-local bind. Off by default. */
    OMNIO_AUTH_ALLOW_INSECURE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),

    /** Root of the local filesystem storage driver. */
    OMNIO_STORAGE_ROOT: z.string().default("./.omnio-data"),
    /** Hard ceiling for a single upload, enforced while streaming. */
    OMNIO_MAX_UPLOAD_MB: z.coerce.number().int().positive().default(512),
    /** Scratch retention before the sweeper reclaims it (decision D3). */
    OMNIO_SCRATCH_TTL_HOURS: z.coerce.number().int().positive().default(24),
    /** Session lifetime; login rotates the token and resets this window. */
    OMNIO_SESSION_TTL_HOURS: z.coerce.number().int().positive().default(168),
    /** How often the repeatable scratch sweeper runs. */
    OMNIO_SWEEP_INTERVAL_MINUTES: z.coerce.number().int().positive().default(60),

    OMNIO_LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),

    /** Extra browser origins allowed for CORS and the CSRF origin check
     * (comma-separated). Same-origin is always allowed; empty in production. */
    OMNIO_ALLOWED_ORIGINS: z
      .string()
      .default("")
      .transform((value) =>
        value
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
    /** Trust X-Forwarded-* so req.ip reflects the real client behind a proxy. */
    OMNIO_TRUST_PROXY: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && PUBLIC_SESSION_SECRETS.has(env.OMNIO_SESSION_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["OMNIO_SESSION_SECRET"],
        message:
          "must be set to a unique strong secret in production (repo defaults and placeholders are refused).",
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
