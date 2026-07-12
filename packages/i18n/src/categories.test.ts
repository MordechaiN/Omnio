import { describe, expect, it } from "vitest";
import { CATEGORY_IDS } from "@omnio/core";
import en from "./messages/en.json";
import he from "./messages/he.json";

/** Catalogs and the platform category list may never drift apart. */
describe.each([
  ["en", en],
  ["he", he],
] as const)("%s categories", (_locale, catalog) => {
  it("cover exactly the platform category IDs", () => {
    expect(Object.keys(catalog.categories).sort()).toEqual([...CATEGORY_IDS].sort());
  });

  it("each category has a name and blurb", () => {
    for (const id of CATEGORY_IDS) {
      const entry = catalog.categories[id];
      expect(entry.name.trim()).not.toBe("");
      expect(entry.blurb.trim()).not.toBe("");
    }
  });
});
