import { describe, expect, it } from "vitest";
import { SystemInfoSchema } from "@omnio/contracts";
import { SystemService } from "./system.service";

describe("SystemService", () => {
  it("returns a payload that satisfies the public contract", () => {
    const info = new SystemService().getInfo();
    expect(() => SystemInfoSchema.parse(info)).not.toThrow();
  });

  it("reports real process uptime", () => {
    const info = new SystemService().getInfo();
    expect(info.uptimeSec).toBeGreaterThan(0);
    expect(info.uptimeSec).toBeLessThanOrEqual(process.uptime());
  });
});
