import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

const base = {
  OMNIO_DATABASE_URL: "postgresql://omnio:omnio@localhost:7432/omnio",
  OMNIO_REDIS_URL: "redis://localhost:7479",
} satisfies NodeJS.ProcessEnv;

/** Real stores, as a deployment would supply them. */
const production = {
  OMNIO_DATABASE_URL: "postgresql://omnio:secret@db.internal:5432/omnio",
  OMNIO_REDIS_URL: "redis://cache.internal:6379",
  OMNIO_SESSION_SECRET: "a".repeat(48),
  NODE_ENV: "production",
} satisfies NodeJS.ProcessEnv;

describe("loadEnv", () => {
  it("applies defaults over the required connection URLs", () => {
    const env = loadEnv(base);
    expect(env.OMNIO_API_PORT).toBe(7410);
    expect(env.OMNIO_MODE).toBe("personal");
    expect(env.OMNIO_SCRATCH_TTL_HOURS).toBe(24);
    expect(env.OMNIO_AUTH_ALLOW_INSECURE).toBe(false);
  });

  it("points at the dev stores with no configuration at all", () => {
    // `pnpm dev` has to work straight after `compose.dev.yaml up -d`, on
    // Omnio's own ports (docs/ports.md) rather than 5432/6379.
    const env = loadEnv({});
    expect(env.OMNIO_DATABASE_URL).toBe("postgresql://omnio:omnio@localhost:7432/omnio");
    expect(env.OMNIO_REDIS_URL).toBe("redis://localhost:7479");
  });

  it("refuses the dev database URL in production", () => {
    expect(() => loadEnv({ ...production, OMNIO_DATABASE_URL: base.OMNIO_DATABASE_URL })).toThrow(
      /OMNIO_DATABASE_URL/,
    );
  });

  it("refuses the dev redis URL in production", () => {
    expect(() => loadEnv({ ...production, OMNIO_REDIS_URL: base.OMNIO_REDIS_URL })).toThrow(
      /OMNIO_REDIS_URL/,
    );
  });

  it("refuses the dev session secret in production", () => {
    const { OMNIO_SESSION_SECRET: _omitted, ...withoutSecret } = production;
    expect(() => loadEnv(withoutSecret)).toThrow(/OMNIO_SESSION_SECRET/);
  });

  it("refuses the .env.example placeholder secret in production", () => {
    expect(() =>
      loadEnv({
        ...production,
        OMNIO_SESSION_SECRET: "change-me-to-a-long-random-secret-value",
      }),
    ).toThrow(/OMNIO_SESSION_SECRET/);
  });

  it("accepts a strong production secret alongside real stores", () => {
    const env = loadEnv(production);
    expect(env.NODE_ENV).toBe("production");
  });
});
