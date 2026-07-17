import { describe, expect, it } from "vitest";
import { generateUuid, generateUuids } from "./generate.ts";

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("generateUuid", () => {
  it("produces a valid v4", () => {
    expect(generateUuid("v4")).toMatch(V4);
  });

  it("produces a valid v7 with a big-endian timestamp prefix", () => {
    const now = 0x0189_abcd_ef01;
    const id = generateUuid("v7", now);
    expect(id).toMatch(V7);
    expect(id.slice(0, 8)).toBe("0189abcd");
  });

  it("v7 values sort by creation time", () => {
    const early = generateUuid("v7", 1000);
    const late = generateUuid("v7", 2000);
    expect(early < late).toBe(true);
  });

  it("generateUuids returns the requested count of unique ids", () => {
    const ids = generateUuids(10, "v4");
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
  });
});
