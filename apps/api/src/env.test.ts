import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

const base = {
  OMNIO_DATABASE_URL: "postgresql://omnio:omnio@localhost:5432/omnio",
  OMNIO_REDIS_URL: "redis://localhost:6379",
} satisfies NodeJS.ProcessEnv;

describe("loadEnv", () => {
  it("applies defaults over the required connection URLs", () => {
    const env = loadEnv(base);
    expect(env.OMNIO_API_PORT).toBe(4000);
    expect(env.OMNIO_MODE).toBe("personal");
    expect(env.OMNIO_SCRATCH_TTL_HOURS).toBe(24);
    expect(env.OMNIO_AUTH_ALLOW_INSECURE).toBe(false);
  });

  it("refuses startup without a database URL", () => {
    expect(() => loadEnv({ OMNIO_REDIS_URL: base.OMNIO_REDIS_URL })).toThrow(/OMNIO_DATABASE_URL/);
  });

  it("refuses the dev session secret in production", () => {
    expect(() => loadEnv({ ...base, NODE_ENV: "production" })).toThrow(/OMNIO_SESSION_SECRET/);
  });

  it("refuses the .env.example placeholder secret in production", () => {
    expect(() =>
      loadEnv({
        ...base,
        NODE_ENV: "production",
        OMNIO_SESSION_SECRET: "change-me-to-a-long-random-secret-value",
      }),
    ).toThrow(/OMNIO_SESSION_SECRET/);
  });

  it("accepts a strong production secret", () => {
    const env = loadEnv({
      ...base,
      NODE_ENV: "production",
      OMNIO_SESSION_SECRET: "a".repeat(48),
    });
    expect(env.NODE_ENV).toBe("production");
  });
});
