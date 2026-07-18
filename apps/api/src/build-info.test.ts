import { describe, expect, it } from "vitest";
import { channelOf, OMNIO_VERSION, readManifest } from "./build-info";
import type { Env } from "./env";

const baseEnv = {
  NODE_ENV: "production",
  OMNIO_MODE: "personal",
} as unknown as Env;

// cwd during tests is apps/api, where no release.json exists, so readManifest
// falls back to the individual build-arg env vars — deterministic for tests.
const buildEnv = {
  OMNIO_VERSION: "0.1.0-alpha.1",
  OMNIO_GIT_COMMIT: "abc1234",
  OMNIO_GIT_BRANCH: "main",
  OMNIO_BUILD_DATE: "2026-07-18T00:00:00Z",
  OMNIO_BUILD_NUMBER: "42",
} as NodeJS.ProcessEnv;

describe("channelOf", () => {
  it("derives the release channel from the pre-release tag", () => {
    expect(channelOf("0.1.0-alpha.1")).toBe("alpha");
    expect(channelOf("0.1.0-beta.2")).toBe("beta");
    expect(channelOf("0.1.0-rc.1")).toBe("rc");
    expect(channelOf("0.1.0")).toBe("stable");
    expect(channelOf("1.2.3")).toBe("stable");
  });
});

describe("readManifest", () => {
  it("assembles build metadata from the environment", () => {
    const m = readManifest(baseEnv, {}, buildEnv);
    expect(m).toMatchObject({
      version: "0.1.0-alpha.1",
      channel: "alpha",
      commit: "abc1234",
      branch: "main",
      buildNumber: "42",
      buildTimestamp: "2026-07-18T00:00:00Z",
      environment: "production",
      mode: "personal",
      database: "postgresql",
    });
  });

  it("includes live runtime fields", () => {
    const m = readManifest(baseEnv, { redis: "7.2.4" }, buildEnv);
    expect(m.node).toBe(process.version);
    expect(m.arch).toBe(process.arch);
    expect(m.hostname).toBeTruthy();
    expect(m.redis).toBe("7.2.4");
  });

  it("reports null redis when unavailable", () => {
    expect(readManifest(baseEnv, {}, buildEnv).redis).toBeNull();
  });

  it("falls back to the compiled-in version with no metadata", () => {
    const m = readManifest(baseEnv, {}, {} as NodeJS.ProcessEnv);
    expect(m.version).toBe(OMNIO_VERSION);
    expect(m.commit).toBe("unknown");
  });

  it("prefers OMNIO_ENVIRONMENT over NODE_ENV", () => {
    const env = { NODE_ENV: "production", OMNIO_MODE: "multi-user", OMNIO_ENVIRONMENT: "staging" } as unknown as Env;
    expect(readManifest(env, {}, buildEnv).environment).toBe("staging");
    expect(readManifest(env, {}, buildEnv).mode).toBe("multi-user");
  });
});
