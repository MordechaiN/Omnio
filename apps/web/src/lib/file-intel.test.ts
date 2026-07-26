import { describe, expect, it } from "vitest";
import type { SearchEntry } from "@/generated/registry.search";
import { insightsFor } from "@omnio/workspace";
import {
  classifyKind,
  fileExtension,
  mimeMatches,
  normalizeMime,
  smartActions,
} from "./file-intel";

describe("normalizeMime", () => {
  it("trusts a real browser mime", () => {
    expect(normalizeMime("image/png", "shot.png")).toBe("image/png");
  });

  it("falls back to the extension for empty or generic types", () => {
    expect(normalizeMime("", "data.json")).toBe("application/json");
    expect(normalizeMime("application/octet-stream", "notes.md")).toBe("text/markdown");
    expect(normalizeMime("", "mystery.xyz")).toBe("");
  });
});

describe("classifyKind", () => {
  it("classifies the six core kinds", () => {
    expect(classifyKind("image/png", "png")).toBe("image");
    expect(classifyKind("application/pdf", "pdf")).toBe("pdf");
    expect(classifyKind("application/zip", "zip")).toBe("zip");
    expect(classifyKind("application/json", "json")).toBe("json");
    expect(classifyKind("text/csv", "csv")).toBe("csv");
    expect(classifyKind("audio/mpeg", "mp3")).toBe("audio");
    expect(classifyKind("application/x-thing", "bin")).toBe("other");
  });
});

describe("mimeMatches", () => {
  it("handles exact, family, and universal patterns", () => {
    expect(mimeMatches("image/png", "image/png")).toBe(true);
    expect(mimeMatches("image/*", "image/webp")).toBe(true);
    expect(mimeMatches("image/*", "audio/wav")).toBe(false);
    expect(mimeMatches("*/*", "anything/at-all")).toBe(true);
  });
});

function entry(
  toolId: string,
  accepts: SearchEntry["accepts"],
  coveredBy: string[] = [],
): SearchEntry {
  return {
    id: `m.${toolId}`,
    moduleId: "m",
    toolId,
    tier: "browser",
    category: "images",
    icon: "image",
    i18nNamespace: "mod-m",
    nameKey: `tools.${toolId}.name`,
    descriptionKey: `tools.${toolId}.description`,
    keywords: [],
    coveredBy,
    accepts,
    href: `/tool/m/${toolId}`,
  };
}

describe("smartActions", () => {
  const registry = [
    entry("image-compress", [{ mime: ["image/*"], priority: 86 }]),
    entry("image-crop", [{ mime: ["image/*"], priority: 90 }]),
    entry("exif-remove", [{ mime: ["image/jpeg", "image/*"], priority: 76 }]),
    entry("zip-create", [{ mime: ["*/*"], priority: 25 }]),
    entry("pdf-merge", [{ mime: ["application/pdf"], priority: 90 }]),
    entry("tiny-only", [{ mime: ["image/*"], maxSizeMB: 1, priority: 99 }]),
  ];

  it("matches by declared mime and orders by priority", () => {
    const actions = smartActions(
      { kind: "image", mime: "image/png", size: 500, facts: {} },
      registry,
    );
    expect(actions.map((a) => a.entry.toolId)).toEqual([
      "tiny-only",
      "image-crop",
      "image-compress",
      "exif-remove",
      "zip-create",
    ]);
  });

  it("respects maxSizeMB and excludes non-matching mimes", () => {
    const actions = smartActions(
      { kind: "image", mime: "image/png", size: 5 * 1024 * 1024, facts: {} },
      registry,
    );
    expect(actions.some((a) => a.entry.toolId === "tiny-only")).toBe(false);
    expect(actions.some((a) => a.entry.toolId === "pdf-merge")).toBe(false);
  });

  it("lifts EXIF removal to the top for a photo with location data", () => {
    const actions = smartActions(
      {
        kind: "image",
        mime: "image/jpeg",
        size: 500_000,
        facts: { hasExif: true },
        // What Omnio understands, in the workspace's own vocabulary — the same
        // value the Inspector reasons from.
        understanding: { kind: "image", width: 1200, height: 800, hasExif: true },
      },
      registry,
    );
    expect(actions[0]!.entry.toolId).toBe("exif-remove");
    expect(actions[0]!.reasonKey).toBe("location-data");
  });

  it("recommends compression only once a file is genuinely awkward to send", () => {
    // 4 MB is fine to attach; the old drop-panel rule nagged from 2 MB, which
    // is most photographs.
    const modest = smartActions(
      { kind: "image", mime: "image/png", size: 4 * 1024 * 1024, facts: {} },
      registry,
    );
    expect(modest.every((a) => a.reasonKey === undefined)).toBe(true);

    const heavy = smartActions(
      { kind: "image", mime: "image/png", size: 12 * 1024 * 1024, facts: {} },
      registry,
    );
    expect(heavy[0]!.entry.toolId).toBe("image-compress");
    expect(heavy[0]!.reasonKey).toBe("large-file");
  });
});

describe("fileExtension", () => {
  it("lowercases, and treats a dotfile as having none", () => {
    expect(fileExtension("Photo.JPG")).toBe("jpg");
    expect(fileExtension("noext")).toBe("");
    expect(fileExtension(".hidden")).toBe("");
  });
});

describe("one understanding, every surface", () => {
  /**
   * The drop panel used to keep its own table of thresholds. It disagreed with
   * the Inspector: a 3 MB, 4000x3000 photo was "large, compress it" on one
   * screen and unremarkable on the other. Both now ask the same engine, so a
   * disagreement is impossible rather than merely unlikely.
   */
  it("recommends what the workspace's own engine concludes", () => {
    const understanding = { kind: "image", width: 4000, height: 3000 } as const;
    const fromEngine = insightsFor({
      name: "DSC_0044.jpg",
      mime: "image/jpeg",
      size: 3 * 1024 * 1024,
      facts: understanding,
    });
    const suggested = new Set(fromEngine.flatMap((i) => (i.suggests ? [i.suggests] : [])));

    const registry = [
      entry("image-resize", [{ mime: ["image/*"], priority: 50 }]),
      entry("image-compress", [{ mime: ["image/*"], priority: 50 }]),
      entry("image-crop", [{ mime: ["image/*"], priority: 50 }]),
    ];
    const ranked = smartActions(
      {
        kind: "image",
        mime: "image/jpeg",
        size: 3 * 1024 * 1024,
        facts: { width: 4000, height: 3000 },
        name: "DSC_0044.jpg",
        understanding,
      },
      registry,
    );

    // Whatever the engine suggests is what the panel lifts, with the reason it gave.
    const boosted = ranked.filter((a) => a.reasonKey !== undefined);
    expect(boosted.length).toBeGreaterThan(0);
    for (const action of boosted) expect(suggested.has(action.entry.toolId)).toBe(true);
    expect(ranked[0]!.entry.toolId).toBe([...suggested][0]);
  });

  it("says nothing about a file it has nothing to say about", () => {
    const ranked = smartActions(
      { kind: "image", mime: "image/png", size: 4096, facts: {}, name: "logo.png" },
      [entry("image-resize", [{ mime: ["image/*"], priority: 50 }])],
    );
    expect(ranked.every((a) => a.reasonKey === undefined)).toBe(true);
  });

  /** Signals that used to exist only on the drop panel now reach every surface. */
  it("carries the panel's old private signals into the shared engine", () => {
    const bigPdf = insightsFor({ name: "report.pdf", mime: "application/pdf", size: 20 * 1024 * 1024 });
    expect(bigPdf.some((i) => i.suggests === "pdf-split-size")).toBe(true);

    const badJson = insightsFor({
      name: "data.json",
      mime: "application/json",
      size: 500,
      facts: { kind: "text", lines: 0, valid: false },
    });
    expect(badJson.some((i) => i.suggests === "json-format")).toBe(true);
  });
});

describe("smartActions coverage", () => {
  /**
   * The first screen anyone sees offered Organize Pages next to Rotate, Delete
   * and Reorder Pages — three jobs Organize already does — so most of it was one
   * capability under four names.
   */
  it("does not recommend a tool a better-placed one already covers", () => {
    const entries = [
      entry("pdf-organize", [{ mime: ["application/pdf"], priority: 88 }]),
      entry("pdf-rotate", [{ mime: ["application/pdf"], priority: 80 }], ["pdf-organize"]),
      entry("pdf-delete", [{ mime: ["application/pdf"], priority: 78 }], ["pdf-organize"]),
      entry("pdf-compress", [{ mime: ["application/pdf"], priority: 75 }]),
    ];
    const offered = smartActions(
      { kind: "pdf", mime: "application/pdf", size: 1000, facts: {} },
      entries,
    ).map((a) => a.entry.toolId);

    expect(offered).toEqual(["pdf-organize", "pdf-compress"]);
  });

  it("still offers a covered tool when its coverer does not apply", () => {
    const entries = [
      entry("pdf-rotate", [{ mime: ["application/pdf"], priority: 80 }], ["pdf-organize"]),
      entry("pdf-compress", [{ mime: ["application/pdf"], priority: 75 }]),
    ];
    const offered = smartActions(
      { kind: "pdf", mime: "application/pdf", size: 1000, facts: {} },
      entries,
    ).map((a) => a.entry.toolId);

    expect(offered).toContain("pdf-rotate");
  });
});

describe("smartActions single-file ranking", () => {
  it("demotes tools that need several files when only one was dropped", () => {
    const entries = [
      entry("merge", [{ mime: ["application/pdf"], priority: 90, multiple: true }]),
      entry("rotate", [{ mime: ["application/pdf"], priority: 60 }]),
    ];
    const actions = smartActions(
      { kind: "pdf", mime: "application/pdf", size: 1000, facts: {} },
      entries,
    );
    // Merge outranks rotate on paper, but can do nothing with one file.
    expect(actions[0]!.entry.toolId).toBe("rotate");
  });
});
