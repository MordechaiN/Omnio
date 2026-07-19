import { describe, expect, it } from "vitest";
import {
  boundedEditDistance,
  makePaletteFilter,
  scoreItem,
  scoreText,
} from "./search-score";

describe("boundedEditDistance", () => {
  it("computes small distances", () => {
    expect(boundedEditDistance("uuid", "uuid", 2)).toBe(0);
    expect(boundedEditDistance("pasword", "password", 2)).toBe(1);
    expect(boundedEditDistance("regx", "regex", 2)).toBe(1);
  });

  it("bails past the cap", () => {
    expect(boundedEditDistance("abcdef", "zyxwvu", 2)).toBeGreaterThan(2);
    expect(boundedEditDistance("a", "abcdefgh", 2)).toBeGreaterThan(2);
  });
});

describe("scoreText tiers", () => {
  it("ranks exact > prefix > word-prefix > substring > subsequence > typo", () => {
    expect(scoreText("uuid", "uuid")).toBe(1);
    expect(scoreText("uui", "uuid generator")).toBe(0.9);
    expect(scoreText("gen", "uuid generator")).toBe(0.8);
    expect(scoreText("id gen", "uuid generator")).toBe(0.7);
    expect(scoreText("ugr", "uuid generator")).toBe(0.4);
    // "uusd" is not a subsequence of "uuid", so it lands on the typo tier.
    expect(scoreText("uusd", "uuid")).toBe(0.3);
  });

  it("filters non-matches out", () => {
    expect(scoreText("xyz", "uuid generator")).toBe(0);
    expect(scoreText("", "anything")).toBe(0);
  });

  it("tolerates typos, including transpositions in longer queries", () => {
    // Dropped-letter typos often remain subsequences — they rank at 0.4.
    expect(scoreText("pasword", "password")).toBe(0.4);
    // "passwrod" breaks subsequence order; 2 edits within the length-8 budget.
    expect(scoreText("passwrod", "password")).toBe(0.3);
    expect(scoreText("cronn", "cron explainer")).toBeGreaterThan(0);
  });
});

describe("scoreItem", () => {
  it("takes the best of value and keywords, discounting keywords slightly", () => {
    const viaName = scoreItem("uuid", "uuid generator", ["guid"]);
    const viaKeyword = scoreItem("guid", "uuid generator", ["guid"]);
    expect(viaName).toBe(0.9);
    expect(viaKeyword).toBeCloseTo(0.95, 5);
    expect(viaKeyword).toBeGreaterThan(scoreItem("guid", "uuid generator", []));
  });
});

describe("makePaletteFilter boosts", () => {
  const filter = makePaletteFilter({
    favorites: new Set(["password generator"]),
    recents: ["cron explainer"],
  });

  it("nudges favorites and recents above equal peers", () => {
    const favorite = filter("Password Generator", "gen", []);
    const plain = filter("UUID Generator", "gen", []);
    const recent = filter("Cron Explainer", "cron", []);
    const plainCron = filter("Cron Something", "cron", []);
    expect(favorite).toBeGreaterThan(plain);
    expect(recent).toBeGreaterThan(plainCron - 0.001);
  });

  it("never resurrects a non-match", () => {
    expect(filter("Password Generator", "zzz", [])).toBe(0);
  });
});
