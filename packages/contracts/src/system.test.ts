import { describe, expect, it } from "vitest";
import { SystemInfoSchema } from "./system.js";

describe("SystemInfoSchema", () => {
  it("accepts a valid payload", () => {
    const parsed = SystemInfoSchema.parse({ name: "omnio", version: "0.1.0", uptimeSec: 12.5 });
    expect(parsed.version).toBe("0.1.0");
  });

  it("rejects a foreign service name", () => {
    expect(() =>
      SystemInfoSchema.parse({ name: "other", version: "0.1.0", uptimeSec: 1 }),
    ).toThrow();
  });

  it("rejects negative uptime", () => {
    expect(() =>
      SystemInfoSchema.parse({ name: "omnio", version: "0.1.0", uptimeSec: -1 }),
    ).toThrow();
  });
});
