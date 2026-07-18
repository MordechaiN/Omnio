import { describe, expect, it } from "vitest";
import { OMNIO_VERSION, readBuildInfo } from "./build-info";
import type { Env } from "./env";

const baseEnv = {
  NODE_ENV: "production",
  OMNIO_MODE: "personal",
} as unknown as Env;

describe("readBuildInfo", () => {
  it("reads injected build metadata from the environment", () => {
    const info = readBuildInfo(baseEnv, {
      OMNIO_VERSION: "0.1.0-alpha.1",
      OMNIO_GIT_COMMIT: "abc1234",
      OMNIO_GIT_BRANCH: "main",
      OMNIO_BUILD_DATE: "2026-07-18T00:00:00Z",
      OMNIO_BUILD_NUMBER: "42",
    } as NodeJS.ProcessEnv);
    expect(info).toMatchObject({
      version: "0.1.0-alpha.1",
      commit: "abc1234",
      branch: "main",
      buildDate: "2026-07-18T00:00:00Z",
      buildNumber: "42",
      environment: "production",
      mode: "personal",
    });
  });

  it("falls back to compiled-in defaults when metadata is absent", () => {
    const info = readBuildInfo(baseEnv, {} as NodeJS.ProcessEnv);
    expect(info.version).toBe(OMNIO_VERSION);
    expect(info.commit).toBe("unknown");
    expect(info.branch).toBe("unknown");
  });

  it("prefers OMNIO_ENVIRONMENT over NODE_ENV for the label", () => {
    const env = { NODE_ENV: "production", OMNIO_MODE: "multi-user", OMNIO_ENVIRONMENT: "staging" } as unknown as Env;
    expect(readBuildInfo(env, {} as NodeJS.ProcessEnv).environment).toBe("staging");
    expect(readBuildInfo(env, {} as NodeJS.ProcessEnv).mode).toBe("multi-user");
  });
});
