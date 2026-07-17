import { describe, expect, it } from "vitest";
import { parseManifest, type ModuleManifest } from "./manifest";

const valid: ModuleManifest = {
  id: "utilities",
  version: "1.0.0",
  category: "utilities",
  icon: "wrench",
  i18nNamespace: "mod-utilities",
  tools: [{ id: "uuid", tier: "browser", surface: "frontend/tools/uuid" }],
  capabilities: { fileActions: [] },
  permissions: [],
};

function firstError(input: unknown): string {
  const result = parseManifest(input);
  if (result.success) throw new Error("expected a validation failure");
  return result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" | ");
}

describe("parseManifest", () => {
  it("accepts a well-formed manifest and applies defaults", () => {
    const result = parseManifest({ ...valid, permissions: undefined });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.permissions).toEqual([]);
  });

  it("requires tierReason above browser tier", () => {
    expect(
      firstError({
        ...valid,
        tools: [{ id: "resize", tier: "worker", surface: "worker/resize" }],
      }),
    ).toMatch(/tierReason is required/);
  });

  it("accepts a worker tool that declares tierReason", () => {
    const result = parseManifest({
      ...valid,
      worker: { binaries: ["sharp"] },
      tools: [
        { id: "resize", tier: "worker", tierReason: "needs sharp", surface: "worker/resize" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects duplicate tool ids", () => {
    expect(
      firstError({
        ...valid,
        tools: [
          { id: "uuid", tier: "browser", surface: "a" },
          { id: "uuid", tier: "browser", surface: "b" },
        ],
      }),
    ).toMatch(/duplicate tool id/);
  });

  it("rejects a fileAction pointing at an unknown tool", () => {
    expect(
      firstError({
        ...valid,
        capabilities: { fileActions: [{ toolId: "ghost", verb: "x", rank: 1 }] },
      }),
    ).toMatch(/unknown tool "ghost"/);
  });

  it("enforces the i18nNamespace convention", () => {
    expect(firstError({ ...valid, i18nNamespace: "wrong" })).toMatch(/mod-utilities/);
  });

  it("rejects a non-kebab module id and bad semver", () => {
    expect(firstError({ ...valid, id: "Utils_1" })).toMatch(/kebab-case/);
    expect(firstError({ ...valid, version: "1.0" })).toMatch(/semver/);
  });
});
