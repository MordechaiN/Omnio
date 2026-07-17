import { describe, expect, it, vi } from "vitest";
import type { Env } from "../env";
import { assertAuthPosture } from "./posture";

function env(overrides: Partial<Env>): Env {
  return {
    NODE_ENV: "development",
    OMNIO_API_PORT: 4000,
    OMNIO_API_HOST: "0.0.0.0",
    OMNIO_DATABASE_URL: "postgresql://localhost/omnio",
    OMNIO_REDIS_URL: "redis://localhost:6379",
    OMNIO_AUTH: "password",
    OMNIO_SESSION_SECRET: "x".repeat(32),
    OMNIO_AUTH_ALLOW_INSECURE: false,
    OMNIO_STORAGE_ROOT: "./.omnio-data",
    OMNIO_MAX_UPLOAD_MB: 512,
    OMNIO_SCRATCH_TTL_HOURS: 24,
    OMNIO_SESSION_TTL_HOURS: 168,
    OMNIO_LOG_LEVEL: "info",
    OMNIO_ALLOWED_ORIGINS: [],
    OMNIO_TRUST_PROXY: false,
    ...overrides,
  };
}

describe("assertAuthPosture", () => {
  it("does nothing when auth is enabled", () => {
    const warn = vi.fn();
    assertAuthPosture(env({ OMNIO_AUTH: "password" }), warn);
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns but allows auth=none on a local bind", () => {
    const warn = vi.fn();
    assertAuthPosture(env({ OMNIO_AUTH: "none", OMNIO_API_HOST: "127.0.0.1" }), warn);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("refuses auth=none on a non-local bind without the override", () => {
    expect(() =>
      assertAuthPosture(env({ OMNIO_AUTH: "none", OMNIO_API_HOST: "0.0.0.0" }), vi.fn()),
    ).toThrow(/refuses a non-local bind/);
  });

  it("allows auth=none on a non-local bind when force-flagged", () => {
    const warn = vi.fn();
    assertAuthPosture(
      env({ OMNIO_AUTH: "none", OMNIO_API_HOST: "0.0.0.0", OMNIO_AUTH_ALLOW_INSECURE: true }),
      warn,
    );
    expect(warn).toHaveBeenCalledOnce();
  });
});
