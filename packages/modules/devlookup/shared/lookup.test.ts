import { describe, expect, it } from "vitest";
import { HTTP_STATUSES, statusClass } from "./http-statuses.ts";
import { MIME_TYPES, searchMime } from "./mime-types.ts";

describe("http status registry", () => {
  it("has unique, ordered codes with names", () => {
    const codes = HTTP_STATUSES.map((status) => status.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect([...codes].sort((a, b) => a - b)).toEqual(codes);
    for (const status of HTTP_STATUSES) expect(status.name.length).toBeGreaterThan(1);
  });

  it("classifies codes", () => {
    expect(statusClass(200)).toBe("2xx");
    expect(statusClass(404)).toBe("4xx");
    expect(statusClass(511)).toBe("5xx");
  });
});

describe("mime search", () => {
  it("finds by extension with or without the dot", () => {
    expect(searchMime(".webp")[0]!.mime).toBe("image/webp");
    expect(searchMime("webp")[0]!.mime).toBe("image/webp");
  });

  it("finds by mime fragment and label", () => {
    expect(searchMime("spreadsheet").length).toBeGreaterThan(0);
    expect(searchMime("video/").every((entry) => entry.mime.startsWith("video/"))).toBe(true);
  });

  it("returns everything for an empty query", () => {
    expect(searchMime("")).toHaveLength(MIME_TYPES.length);
  });
});
