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

/**
 * The dev stores from `docker/compose.dev.yaml`, on Omnio's own ports
 * (docs/ports.md). They are defaults so that `pnpm dev` runs straight after
 * `docker compose -f docker/compose.dev.yaml up -d`, with nothing to copy or
 * export first — which is what CONTRIBUTING.md promises.
 *
 * Refused in production, where a silent fallback to localhost would be a
 * misconfiguration wearing a convenience costume: the process would start,
 * connect to nothing, and look healthy until someone tried to use it.
 */
const DEV_DATABASE_URL = "postgresql://omnio:omnio@localhost:7432/omnio";
const DEV_REDIS_URL = "redis://localhost:7479";

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    /** Human-facing environment label for the About page / version endpoint
     * (e.g. "production", "staging"). Defaults to NODE_ENV when unset. */
    OMNIO_ENVIRONMENT: z.string().optional(),
    OMNIO_API_PORT: z.coerce.number().int().min(1).max(65535).default(7410),
    /**
     * Loopback by default. Personal mode has no login, so a process that binds
     * every interface by accident is an authless api on the network — and the
     * posture check rightly refuses to start, which also made `pnpm dev` fail
     * out of the box. Containers that need every interface say so explicitly
     * (docker/compose.yaml), where the surrounding network is the real boundary.
     */
    OMNIO_API_HOST: z.string().default("127.0.0.1"),

    OMNIO_DATABASE_URL: z.string().url().default(DEV_DATABASE_URL),
    OMNIO_REDIS_URL: z.string().url().default(DEV_REDIS_URL),
    /** Worker health base URL for the /api/health service check (internal). */
    OMNIO_WORKER_HEALTH_URL: z.string().url().default("http://worker:7420"),

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
    if (env.NODE_ENV === "production") {
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
