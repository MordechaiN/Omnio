import { describe, expect, it } from "vitest";
import { healthPayload } from "./health";

describe("healthPayload", () => {
  it("identifies the service", () => {
    expect(healthPayload(3.2)).toEqual({
      status: "ok",
      service: "omnio-worker",
      uptimeSec: 3.2,
    });
  });

  it("rejects invalid uptime", () => {
    expect(() => healthPayload(-1)).toThrow(RangeError);
    expect(() => healthPayload(Number.NaN)).toThrow(RangeError);
  });
});
