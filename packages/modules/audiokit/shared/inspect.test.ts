import { describe, expect, it } from "vitest";
import { averageBitrateKbps, formatDuration, uncompressedBytes } from "./inspect.ts";

describe("averageBitrateKbps", () => {
  it("matches a familiar case: 128 kbps for a three-minute song", () => {
    // 3:00 at 128 kbps is about 2.88 MB.
    expect(averageBitrateKbps(2_880_000, 180)).toBe(128);
  });

  it("handles a long recording without losing precision", () => {
    expect(averageBitrateKbps(48_000_000, 3600)).toBe(107);
  });

  it("refuses to divide by nothing", () => {
    expect(averageBitrateKbps(1000, 0)).toBeNull();
    expect(averageBitrateKbps(0, 60)).toBeNull();
    expect(averageBitrateKbps(1000, Number.NaN)).toBeNull();
    // A stream with no known duration reports Infinity in some browsers.
    expect(averageBitrateKbps(1000, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("formatDuration", () => {
  it("reads like a player's clock", () => {
    expect(formatDuration(9)).toBe("0:09");
    expect(formatDuration(249)).toBe("4:09");
    expect(formatDuration(3849)).toBe("1:04:09");
  });

  it("says nothing rather than something wrong", () => {
    expect(formatDuration(Number.NaN)).toBe("—");
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe("—");
    expect(formatDuration(-5)).toBe("—");
  });
});

describe("uncompressedBytes", () => {
  it("sizes a minute of CD-quality audio", () => {
    expect(uncompressedBytes(60)).toBe(10_584_000);
  });

  it("is zero when the duration is unknown", () => {
    expect(uncompressedBytes(Number.NaN)).toBe(0);
    expect(uncompressedBytes(0)).toBe(0);
  });
});
