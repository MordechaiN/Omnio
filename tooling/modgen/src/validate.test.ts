import { describe, expect, it } from "vitest";
import { validateModules, type ModuleSource, type ValidationContext } from "./validate";

const CATEGORIES = ["utilities", "pdf"] as const;

function manifest(overrides: Record<string, unknown> = {}): unknown {
  return {
    id: "utilities",
    version: "1.0.0",
    category: "utilities",
    icon: "wrench",
    i18nNamespace: "mod-utilities",
    tools: [{ id: "uuid", tier: "browser", surface: "frontend/tools/uuid" }],
    ...overrides,
  };
}

function catalog(): Record<string, unknown> {
  return {
    name: "Utilities",
    description: "Handy tools",
    tools: { uuid: { name: "UUID", description: "Generate a UUID" } },
  };
}

function ctx(over: Partial<ValidationContext> = {}): ValidationContext {
  return {
    categoryIds: CATEGORIES,
    surfaceExists: () => true,
    loadCatalog: () => catalog(),
    ...over,
  };
}

function run(sources: ModuleSource[], context = ctx()) {
  return validateModules(sources, context);
}

describe("validateModules", () => {
  it("accepts a well-formed module", () => {
    const { modules, errors } = run([{ dir: "utilities", manifest: manifest() }]);
    expect(errors).toEqual([]);
    expect(modules).toHaveLength(1);
  });

  it("rejects an unknown category", () => {
    const { errors } = run([{ dir: "utilities", manifest: manifest({ category: "nope" }) }]);
    expect(errors.some((e) => /unknown category/.test(e.message))).toBe(true);
  });

  it("rejects a folder name that does not match the id", () => {
    const { errors } = run([{ dir: "utils", manifest: manifest() }]);
    expect(errors.some((e) => /must equal its folder name/.test(e.message))).toBe(true);
  });

  it("flags a missing surface", () => {
    const { errors } = run(
      [{ dir: "utilities", manifest: manifest() }],
      ctx({ surfaceExists: () => false }),
    );
    expect(errors.some((e) => /missing surface/.test(e.message))).toBe(true);
  });

  it("flags a missing i18n key", () => {
    const { errors } = run(
      [{ dir: "utilities", manifest: manifest() }],
      ctx({ loadCatalog: () => ({ name: "x", description: "y", tools: {} }) }),
    );
    expect(errors.some((e) => /missing key "tools.uuid.name"/.test(e.message))).toBe(true);
  });

  it("flags en/he parity gaps", () => {
    const en = catalog();
    const he = { ...catalog(), extra: "only-in-he" };
    const { errors } = run(
      [{ dir: "utilities", manifest: manifest() }],
      ctx({ loadCatalog: (_dir, locale) => (locale === "en" ? en : he) }),
    );
    expect(errors.some((e) => /"extra" is in he but missing from en/.test(e.message))).toBe(true);
  });

  it("surfaces schema errors (missing tierReason)", () => {
    const { errors } = run([
      {
        dir: "pdf",
        manifest: manifest({
          id: "pdf",
          category: "pdf",
          i18nNamespace: "mod-pdf",
          tools: [{ id: "merge", tier: "worker", surface: "s" }],
        }),
      },
    ]);
    expect(errors.some((e) => /tierReason is required/.test(e.message))).toBe(true);
  });

  it("detects duplicate module ids", () => {
    const { errors } = run([
      { dir: "utilities", manifest: manifest() },
      { dir: "utilities", manifest: manifest() },
    ]);
    expect(errors.some((e) => /duplicate module id/.test(e.message))).toBe(true);
  });
});
