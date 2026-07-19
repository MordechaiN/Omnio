import { describe, expect, it } from "vitest";
import type { SearchEntry } from "@/generated/registry.search";
import {
  classifyKind,
  fileExtension,
  mimeMatches,
  normalizeMime,
  recommendationNudges,
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

function entry(toolId: string, accepts: SearchEntry["accepts"]): SearchEntry {
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
      },
      registry,
    );
    expect(actions[0]!.entry.toolId).toBe("exif-remove");
    expect(actions[0]!.reasonKey).toBe("exifPresent");
  });

  it("recommends compression for large images with a reason", () => {
    const actions = smartActions(
      { kind: "image", mime: "image/png", size: 4 * 1024 * 1024, facts: {} },
      registry,
    );
    expect(actions[0]!.entry.toolId).toBe("image-compress");
    expect(actions[0]!.reasonKey).toBeDefined();
  });
});

describe("recommendationNudges", () => {
  it("flags invalid JSON toward the formatter", () => {
    const nudges = recommendationNudges({
      kind: "json",
      mime: "application/json",
      size: 100,
      facts: { jsonValid: false },
    });
    expect(nudges).toEqual([
      { toolId: "json-format", boost: 20, reasonKey: "invalidJson" },
    ]);
  });

  it("stays quiet for an unremarkable file", () => {
    expect(
      recommendationNudges({ kind: "text", mime: "text/plain", size: 10, facts: {} }),
    ).toEqual([]);
  });
});

describe("fileExtension", () => {
  it("extracts and lowercases", () => {
    expect(fileExtension("Photo.JPG")).toBe("jpg");
    expect(fileExtension("noext")).toBe("");
    expect(fileExtension(".hidden")).toBe("");
  });
});
