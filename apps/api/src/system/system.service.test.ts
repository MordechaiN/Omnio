import { describe, expect, it } from "vitest";
import { SystemInfoSchema } from "@omnio/contracts";
import type { Env } from "../env";
import { SystemService } from "./system.service";

const env = { NODE_ENV: "test", OMNIO_MODE: "personal" } as unknown as Env;

describe("SystemService", () => {
  it("returns a payload that satisfies the public contract", () => {
    const info = new SystemService(env).getInfo();
    expect(() => SystemInfoSchema.parse(info)).not.toThrow();
  });

  it("reports real process uptime", () => {
    const info = new SystemService(env).getInfo();
    expect(info.uptimeSec).toBeGreaterThan(0);
    expect(info.uptimeSec).toBeLessThanOrEqual(process.uptime());
  });
});
