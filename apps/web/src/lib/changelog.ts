/**
 * Parser for the root CHANGELOG.md (Keep a Changelog format) — pure and
 * framework-free so the Changelog page can render it and tests can pin the
 * shape. Read at build time; the structured result is baked into the page.
 *
 * Recognizes `## [version] - date` release headers and `### Section` groups
 * (Added/Changed/Fixed/Security/…). "Added" is surfaced to users as "New".
 */
export interface ChangelogSection {
  /** Canonical Keep-a-Changelog section name (Added, Changed, Fixed, Security…). */
  type: string;
  items: string[];
}

export interface Release {
  version: string;
  date: string | null;
  yanked: boolean;
  sections: ChangelogSection[];
}

const RELEASE_RE = /^##\s+\[([^\]]+)\](?:\s*-\s*(\S+))?(.*)$/;
const SECTION_RE = /^###\s+(.+?)\s*$/;
const ITEM_RE = /^[-*]\s+(.*)$/;

export function parseChangelog(markdown: string): Release[] {
  const releases: Release[] = [];
  let release: Release | null = null;
  let section: ChangelogSection | null = null;

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trimEnd();

    const releaseMatch = RELEASE_RE.exec(line);
    if (releaseMatch) {
      release = {
        version: releaseMatch[1]!.trim(),
        date: releaseMatch[2]?.trim() ?? null,
        yanked: /\[yanked\]/i.test(releaseMatch[3] ?? ""),
        sections: [],
      };
      section = null;
      releases.push(release);
      continue;
    }

    if (!release) continue;

    const sectionMatch = SECTION_RE.exec(line);
    if (sectionMatch) {
      section = { type: sectionMatch[1]!.trim(), items: [] };
      release.sections.push(section);
      continue;
    }

    const itemMatch = ITEM_RE.exec(line.trimStart());
    if (itemMatch && section) {
      section.items.push(itemMatch[1]!.trim());
    }
  }

  // Drop an empty "Unreleased" placeholder so users never see a hollow entry.
  return releases.filter(
    (r) => r.version.toLowerCase() !== "unreleased" || r.sections.length > 0,
  );
}

/** Display label for a section — "Added" reads as "New" for end users. */
export function sectionLabel(type: string): string {
  return type.toLowerCase() === "added" ? "New" : type;
}
