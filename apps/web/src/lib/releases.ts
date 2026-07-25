import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Release notes, authored once per release with every language side by side.
 *
 * Release notes are product copy, not documentation, so they are written rather
 * than translated at runtime. Keeping all languages in a single file per release
 * is what keeps them synchronised: a release cannot gain an English line and
 * quietly leave the others behind, because they are edited together.
 *
 * Read at build time; the page renders only the reader's language.
 */

export type ReleaseSectionType = "new" | "improved" | "fixed" | "known";

interface LocalizedText {
  [locale: string]: string;
}

interface RawSection {
  type: ReleaseSectionType;
  items: LocalizedText[];
}

interface RawRelease {
  version: string;
  date: string;
  headline: LocalizedText;
  sections: RawSection[];
}

export interface ReleaseSection {
  type: ReleaseSectionType;
  items: string[];
}

export interface Release {
  version: string;
  date: string;
  headline: string;
  sections: ReleaseSection[];
}

const CONTENT_DIR = join(process.cwd(), "..", "..", "content", "releases");

/** Newest first, by semantic version. */
function compareVersions(a: string, b: string): number {
  const parse = (v: string) => {
    const [core, pre = ""] = v.split("-");
    const nums = core!.split(".").map(Number);
    return { nums, pre };
  };
  const left = parse(a);
  const right = parse(b);
  for (let i = 0; i < 3; i += 1) {
    const diff = (right.nums[i] ?? 0) - (left.nums[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return right.pre.localeCompare(left.pre);
}

function readAll(): RawRelease[] {
  let names: string[];
  try {
    names = readdirSync(CONTENT_DIR).filter((name) => name.endsWith(".json"));
  } catch {
    return [];
  }
  return names
    .map((name) => JSON.parse(readFileSync(join(CONTENT_DIR, name), "utf8")) as RawRelease)
    .sort((a, b) => compareVersions(a.version, b.version));
}

/**
 * Every release in one language.
 *
 * A line with no text in the reader's language is dropped rather than shown in
 * another one. Mixed languages read as a bug in the product, and an incomplete
 * list is a smaller problem than a page that switches language mid-sentence.
 */
export function loadReleases(locale: string): Release[] {
  return readAll().flatMap((release) => {
    const headline = release.headline[locale];
    if (!headline) return [];
    const sections = release.sections
      .map((section) => ({
        type: section.type,
        items: section.items.flatMap((item) => (item[locale] ? [item[locale]!] : [])),
      }))
      .filter((section) => section.items.length > 0);
    return [{ version: release.version, date: release.date, headline, sections }];
  });
}

/** Locales every release is written in — used to prove none has fallen behind. */
export function localeCoverage(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const release of readAll()) {
    for (const locale of Object.keys(release.headline)) {
      counts[locale] = (counts[locale] ?? 0) + 1;
    }
  }
  return counts;
}

export function releaseCount(): number {
  return readAll().length;
}
