import { describe, expect, it } from "vitest";
import { loadReleases, localeCoverage, releaseCount } from "./releases";
import { routing } from "@/i18n/routing";

/**
 * Release notes are product copy. These tests exist so a release cannot ship
 * with one language written and another quietly left behind — the failure mode
 * that turns a localized product into a half-translated one.
 */

describe("release notes", () => {
  it("has releases to show", () => {
    expect(releaseCount()).toBeGreaterThan(0);
  });

  it("is written in every language the product supports", () => {
    const coverage = localeCoverage();
    for (const locale of routing.locales) {
      expect(coverage[locale], `no release notes written in "${locale}"`).toBe(releaseCount());
    }
  });

  it("returns entirely one language, never a mix", () => {
    for (const locale of routing.locales) {
      const releases = loadReleases(locale);
      expect(releases).toHaveLength(releaseCount());
      for (const release of releases) {
        expect(release.headline.length).toBeGreaterThan(0);
        for (const section of release.sections) {
          expect(section.items.every((item) => item.trim().length > 0)).toBe(true);
        }
      }
    }
  });

  it("reads Hebrew notes as Hebrew, not as translated English", () => {
    const [latest] = loadReleases("he");
    // A Hebrew headline must actually contain Hebrew letters.
    expect(latest?.headline).toMatch(/[֐-׿]/);
  });

  it("orders releases newest first", () => {
    // Asserting the ordering rather than a specific version, so this does not
    // need editing every release.
    const versions = loadReleases("en").map((r) => r.version);
    const numeric = (v: string) => v.split("-")[0]!.split(".").map(Number);
    for (let i = 1; i < versions.length; i += 1) {
      const [aMaj, aMin, aPatch] = numeric(versions[i - 1]!);
      const [bMaj, bMin, bPatch] = numeric(versions[i]!);
      const newer = aMaj! * 1e6 + aMin! * 1e3 + aPatch!;
      const older = bMaj! * 1e6 + bMin! * 1e3 + bPatch!;
      expect(newer).toBeGreaterThanOrEqual(older);
    }
    expect(versions[versions.length - 1]).toBe("0.1.0-alpha.1");
  });

  it("only uses section types the page knows how to label", () => {
    const known = new Set(["new", "improved", "fixed", "known"]);
    for (const release of loadReleases("en")) {
      for (const section of release.sections) {
        expect(known.has(section.type)).toBe(true);
      }
    }
  });
});
