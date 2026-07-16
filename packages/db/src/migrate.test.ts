import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PRISMA_SCHEMA_PATH } from "./migrate";

describe("PRISMA_SCHEMA_PATH", () => {
  it("resolves to the packaged schema file", () => {
    expect(PRISMA_SCHEMA_PATH.endsWith("prisma/schema.prisma")).toBe(true);
    expect(existsSync(PRISMA_SCHEMA_PATH)).toBe(true);
  });
});
