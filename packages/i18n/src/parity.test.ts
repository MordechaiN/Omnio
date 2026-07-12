import { describe, expect, it } from "vitest";
import en from "./messages/en.json";
import he from "./messages/he.json";

/**
 * The rule that keeps Hebrew first-class: catalogs cannot drift.
 * Same keys, same ICU placeholders, no empty strings — in every locale.
 */

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(path, value);
    else for (const [p, v] of flatten(value, path)) out.set(p, v);
  }
  return out;
}

function placeholders(message: string): string[] {
  return [...message.matchAll(/\{(\w+)(?:,[^}]*)?\}/g)].map((m) => m[1] ?? "").sort();
}

const flatEn = flatten(en as Tree);
const flatHe = flatten(he as Tree);

describe("catalog parity (en ↔ he)", () => {
  it("he has every en key", () => {
    const missing = [...flatEn.keys()].filter((k) => !flatHe.has(k));
    expect(missing, `missing in he.json:\n${missing.join("\n")}`).toEqual([]);
  });

  it("he has no extra keys", () => {
    const extra = [...flatHe.keys()].filter((k) => !flatEn.has(k));
    expect(extra, `extra in he.json:\n${extra.join("\n")}`).toEqual([]);
  });

  it("no message is empty in any locale", () => {
    for (const [locale, flat] of [
      ["en", flatEn],
      ["he", flatHe],
    ] as const) {
      for (const [key, value] of flat) {
        expect(value.trim(), `${locale}:${key} is empty`).not.toBe("");
      }
    }
  });

  it("ICU placeholders match between locales", () => {
    for (const [key, enValue] of flatEn) {
      const heValue = flatHe.get(key);
      if (heValue === undefined) continue; // covered by the key test
      expect(placeholders(heValue), `placeholder mismatch at ${key}`).toEqual(
        placeholders(enValue),
      );
    }
  });
});
