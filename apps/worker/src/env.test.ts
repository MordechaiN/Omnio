import { describe, expect, it } from "vitest";
import { loadEnv } from "./env.js";

describe("worker loadEnv", () => {
  it("points at the dev stores with no configuration at all", () => {
    // `pnpm dev` has to work straight after `compose.dev.yaml up -d`, on
    // Omnio's own ports (docs/ports.md) rather than 5432/6379.
    const env = loadEnv({});
    expect(env.OMNIO_DATABASE_URL).toBe("postgresql://omnio:omnio@localhost:7432/omnio");
    expect(env.OMNIO_REDIS_URL).toBe("redis://localhost:7479");
    expect(env.OMNIO_WORKER_HEALTH_PORT).toBe(7420);
  });

  it("refuses the dev stores in production", () => {
    expect(() => loadEnv({ NODE_ENV: "production" })).toThrow(/OMNIO_DATABASE_URL/);
    expect(() =>
      loadEnv({
        NODE_ENV: "production",
        OMNIO_DATABASE_URL: "postgresql://omnio:secret@db.internal:5432/omnio",
      }),
    ).toThrow(/OMNIO_REDIS_URL/);
  });

  it("accepts real stores in production", () => {
    const env = loadEnv({
      NODE_ENV: "production",
      OMNIO_DATABASE_URL: "postgresql://omnio:secret@db.internal:5432/omnio",
      OMNIO_REDIS_URL: "redis://cache.internal:6379",
    });
    expect(env.NODE_ENV).toBe("production");
  });
});
