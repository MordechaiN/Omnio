import { describe, expect, it } from "vitest";
import {
  baseName,
  discover,
  documentVersions,
  extensionOf,
  habits,
  imageSizeSets,
  steppingStones,
  stripSizeTokens,
  stripVersionMarkers,
  supersededExportOf,
  supersededExports,
  workSessions,
} from "./discoveries.ts";
import type { WorkspaceEvent, WorkspaceFile } from "./model.ts";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
/** "Now" for tests: far enough ahead that nothing counts as still-warm. */
const NOW = 100 * DAY;

function file(over: Partial<WorkspaceFile> & { id: string }): WorkspaceFile {
  return {
    name: over.id,
    mime: "application/pdf",
    size: 100,
    hash: `h-${over.id}`,
    createdAt: 0,
    lastOpenedAt: 0,
    pinned: false,
    tagIds: [],
    collectionIds: [],
    ...over,
  };
}

function event(over: Partial<WorkspaceEvent> & { id: string; fileId: string }): WorkspaceEvent {
  return { type: "opened", at: 0, ...over };
}

function image(
  over: Partial<WorkspaceFile> & { id: string },
  width: number,
  height: number,
): WorkspaceFile {
  return file({ mime: "image/png", facts: { kind: "image", width, height }, ...over });
}

/* --------------------------------------------------------------- naming */

describe("name parsing", () => {
  it("splits a name from its extension", () => {
    expect(baseName("report v2.pdf")).toBe("report v2");
    expect(extensionOf("report v2.PDF")).toBe("pdf");
    expect(baseName("no-extension")).toBe("no-extension");
    expect(extensionOf("no-extension")).toBe("");
  });

  it("strips explicit version markers, however they are written", () => {
    for (const name of ["report v2", "report-v2", "report_V2", "report (2)", "report copy", "report final"]) {
      expect(stripVersionMarkers(name)).toEqual({ stem: "report", marked: true });
    }
  });

  it("peels several markers at once", () => {
    expect(stripVersionMarkers("report final (2)").stem).toBe("report");
  });

  /** The bug that would make this feature untrustworthy. */
  it("never treats a bare trailing number as a version", () => {
    expect(stripVersionMarkers("chapter 2")).toEqual({ stem: "chapter 2", marked: false });
    expect(stripVersionMarkers("IMG_0021")).toEqual({ stem: "IMG_0021", marked: false });
  });

  it("strips size markers", () => {
    expect(stripSizeTokens("hero-1920x1080")).toBe("hero");
    expect(stripSizeTokens("hero@2x")).toBe("hero");
    expect(stripSizeTokens("hero-thumb")).toBe("hero");
    expect(stripSizeTokens("hero")).toBe("hero");
  });
});

/* --------------------------------------------------- superseded exports */

describe("supersededExports", () => {
  /** Exported a PDF on Monday; a new copy of the source landed on Wednesday. */
  const source = file({ id: "src", name: "report.docx", hash: "v1", createdAt: 1 * DAY });
  const result = file({
    id: "pdf",
    name: "report.pdf",
    createdAt: 2 * DAY,
    derivedFrom: { fileId: "src", toolId: "docx-to-pdf" },
  });
  const replacement = file({ id: "src2", name: "report.docx", hash: "v2", createdAt: 3 * DAY });

  it("notices that a result no longer reflects its source", () => {
    const [found] = supersededExports([source, result, replacement], NOW);
    expect(found).toBeDefined();
    expect(found!.result.id).toBe("pdf");
    expect(found!.replacement.id).toBe("src2");
    expect(found!.toolId).toBe("docx-to-pdf");
  });

  it("stays quiet once the work has been redone", () => {
    const redone = file({
      id: "pdf2",
      name: "report.pdf",
      createdAt: 4 * DAY,
      derivedFrom: { fileId: "src2", toolId: "docx-to-pdf" },
    });
    expect(supersededExports([source, result, replacement, redone], NOW)).toHaveLength(0);
  });

  it("ignores a same-name file that arrived before the export", () => {
    const earlier = file({ id: "src0", name: "report.docx", hash: "v0", createdAt: 0 });
    expect(supersededExports([earlier, source, result], NOW)).toHaveLength(0);
  });

  it("ignores identical contents re-imported under the same name", () => {
    const sameBytes = file({ id: "src-copy", name: "report.docx", hash: "v1", createdAt: 3 * DAY });
    expect(supersededExports([source, result, sameBytes], NOW)).toHaveLength(0);
  });

  it("answers for a single file, the same way it does for the workspace", () => {
    const all = [source, result, replacement];
    expect(supersededExportOf(result, all, NOW)?.replacement.id).toBe("src2");
    // The source itself is not out of date; only what was built from it is.
    expect(supersededExportOf(source, all, NOW)).toBeNull();
    expect(supersededExportOf(replacement, all, NOW)).toBeNull();
  });

  it("says nothing about work that just happened", () => {
    const fresh = file({
      id: "fresh",
      name: "report.pdf",
      createdAt: NOW - MIN,
      derivedFrom: { fileId: "src", toolId: "docx-to-pdf" },
    });
    const newer = file({ id: "src3", name: "report.docx", hash: "v9", createdAt: NOW });
    expect(supersededExports([source, fresh, newer], NOW)).toHaveLength(0);
  });
});

/* ------------------------------------------------------------- versions */

describe("documentVersions", () => {
  it("groups drafts that carry a version marker", () => {
    const files = [
      file({ id: "a", name: "contract.pdf", hash: "1", createdAt: 1 }),
      file({ id: "b", name: "contract v2.pdf", hash: "2", createdAt: 2 }),
      file({ id: "c", name: "contract final.pdf", hash: "3", createdAt: 3 }),
    ];
    const [found] = documentVersions(files);
    expect(found).toBeDefined();
    expect(found!.versionCount).toBe(3);
    expect(found!.newest.id).toBe("c");
    expect(found!.stem).toBe("contract");
  });

  it("groups identical names holding different contents", () => {
    const files = [
      file({ id: "a", name: "notes.txt", mime: "text/plain", hash: "1", createdAt: 1 }),
      file({ id: "b", name: "notes.txt", mime: "text/plain", hash: "2", createdAt: 2 }),
    ];
    expect(documentVersions(files)).toHaveLength(1);
  });

  it("does not treat numbered parts as versions", () => {
    const files = [
      file({ id: "a", name: "chapter 1.pdf", hash: "1" }),
      file({ id: "b", name: "chapter 2.pdf", hash: "2" }),
    ];
    expect(documentVersions(files)).toHaveLength(0);
  });

  it("does not treat a conversion as a version", () => {
    const files = [
      file({ id: "a", name: "report.docx", hash: "1" }),
      file({ id: "b", name: "report.pdf", hash: "2" }),
    ];
    expect(documentVersions(files)).toHaveLength(0);
  });

  /** A file and something eventually made from it are one lineage, not two drafts. */
  it("does not treat an output as a version of its own source", () => {
    const files = [
      file({ id: "scan", name: "scan.pdf", hash: "1", createdAt: 1 }),
      file({
        id: "ocr",
        name: "scan-ocr.pdf",
        hash: "2",
        createdAt: 2,
        derivedFrom: { fileId: "scan", toolId: "pdf-ocr" },
      }),
      file({
        id: "done",
        name: "scan-final.pdf",
        hash: "3",
        createdAt: 3,
        derivedFrom: { fileId: "ocr", toolId: "pdf-compress" },
      }),
    ];
    expect(documentVersions(files)).toHaveLength(0);
  });

  it("leaves exact duplicates to duplicate detection", () => {
    const files = [
      file({ id: "a", name: "contract.pdf", hash: "same" }),
      file({ id: "b", name: "contract copy.pdf", hash: "same" }),
    ];
    expect(documentVersions(files)).toHaveLength(0);
  });
});

/* ---------------------------------------------------------- image sizes */

describe("imageSizeSets", () => {
  it("spots one picture held at several resolutions", () => {
    const files = [
      image({ id: "a", name: "hero-1920x1080.png", size: 900 }, 1920, 1080),
      image({ id: "b", name: "hero-960x540.png", size: 300 }, 960, 540),
    ];
    const [found] = imageSizeSets(files);
    expect(found).toBeDefined();
    expect(found!.largest.id).toBe("a");
    expect(found!.dimensions).toEqual(["1920×1080", "960×540"]);
    expect(found!.reclaimableBytes).toBe(300);
  });

  it("ignores same-named images of a different shape", () => {
    const files = [
      image({ id: "a", name: "hero-large.png" }, 1000, 1000),
      image({ id: "b", name: "hero-small.png" }, 800, 200),
    ];
    expect(imageSizeSets(files)).toHaveLength(0);
  });

  it("stays quiet when the workspace already shows the relationship", () => {
    const files = [
      image({ id: "a", name: "hero.png" }, 1920, 1080),
      image(
        { id: "b", name: "hero-small.png", derivedFrom: { fileId: "a", toolId: "image-resize" } },
        960,
        540,
      ),
    ];
    expect(imageSizeSets(files)).toHaveLength(0);
  });
});

/* -------------------------------------------------------------- sessions */

describe("workSessions", () => {
  it("reconstructs a stretch of work and forgets the gaps", () => {
    const files = [file({ id: "a" }), file({ id: "b" }), file({ id: "c" })];
    const events = [
      event({ id: "1", fileId: "a", type: "imported", at: 10 * DAY }),
      event({ id: "2", fileId: "b", type: "imported", at: 10 * DAY + MIN }),
      event({ id: "3", fileId: "c", type: "opened", toolId: "pdf-merge", at: 10 * DAY + 2 * MIN }),
      // Days later — a separate session, and too small to report.
      event({ id: "4", fileId: "a", type: "opened", at: 20 * DAY }),
    ];
    const found = workSessions(files, events, NOW);
    expect(found).toHaveLength(1);
    expect(found[0]!.fileCount).toBe(3);
    expect(found[0]!.toolIds).toEqual(["pdf-merge"]);
  });

  it("does not narrate the session in progress", () => {
    const files = [file({ id: "a" }), file({ id: "b" }), file({ id: "c" })];
    const events = [
      event({ id: "1", fileId: "a", at: NOW - 2 * MIN }),
      event({ id: "2", fileId: "b", at: NOW - MIN }),
      event({ id: "3", fileId: "c", at: NOW }),
    ];
    expect(workSessions(files, events, NOW)).toHaveLength(0);
  });

  it("ignores housekeeping", () => {
    const files = [file({ id: "a" }), file({ id: "b" }), file({ id: "c" })];
    const events = [
      event({ id: "1", fileId: "a", type: "evicted", at: 10 * DAY }),
      event({ id: "2", fileId: "b", type: "deleted", at: 10 * DAY + MIN }),
      event({ id: "3", fileId: "c", type: "evicted", at: 10 * DAY + 2 * MIN }),
    ];
    expect(workSessions(files, events, NOW)).toHaveLength(0);
  });
});

/* -------------------------------------------------------- stepping stones */

describe("steppingStones", () => {
  const scan = file({ id: "scan", createdAt: 0 });
  const middle = (over: Partial<WorkspaceFile> & { id: string }) =>
    file({
      createdAt: 1 * DAY,
      lastOpenedAt: 0,
      size: 1_000,
      derivedFrom: { fileId: "scan", toolId: "pdf-ocr" },
      ...over,
    });

  it("finds files that were only ever a step towards something else", () => {
    const files = [
      scan,
      middle({ id: "m1" }),
      middle({ id: "m2" }),
      file({ id: "final1", createdAt: 2 * DAY, derivedFrom: { fileId: "m1", toolId: "pdf-compress" } }),
      file({ id: "final2", createdAt: 2 * DAY, derivedFrom: { fileId: "m2", toolId: "pdf-compress" } }),
    ];
    const [found] = steppingStones(files, NOW);
    expect(found).toBeDefined();
    expect(found!.files.map((f) => f.id).sort()).toEqual(["m1", "m2"]);
    expect(found!.reclaimableBytes).toBe(2_000);
  });

  it("keeps anything pinned, reopened, or still recent", () => {
    const files = [
      scan,
      middle({ id: "pinned", pinned: true }),
      middle({ id: "reopened", lastOpenedAt: 5 * DAY }),
      middle({ id: "recent", createdAt: NOW - HOUR }),
      file({ id: "f1", derivedFrom: { fileId: "pinned", toolId: "x" } }),
      file({ id: "f2", derivedFrom: { fileId: "reopened", toolId: "x" } }),
      file({ id: "f3", derivedFrom: { fileId: "recent", toolId: "x" } }),
    ];
    expect(steppingStones(files, NOW)).toHaveLength(0);
  });

  it("leaves finished outputs alone", () => {
    const files = [scan, middle({ id: "leaf" })];
    expect(steppingStones(files, NOW)).toHaveLength(0);
  });
});

/* ---------------------------------------------------------------- habits */

describe("habits", () => {
  const compressed = (id: string, at: number) => [
    file({ id, name: `${id}.png`, mime: "image/png", createdAt: at }),
    file({
      id: `${id}-out`,
      mime: "image/png",
      createdAt: at + MIN,
      derivedFrom: { fileId: id, toolId: "image-compress" },
    }),
  ];

  it("learns a reflex, and reports what is still missing it", () => {
    const files = [
      ...compressed("a", 1 * DAY),
      ...compressed("b", 2 * DAY),
      ...compressed("c", 3 * DAY),
      file({ id: "untouched", name: "untouched.png", mime: "image/png", createdAt: 4 * DAY }),
    ];
    const [found] = habits(files, NOW);
    expect(found).toBeDefined();
    expect(found!.toolId).toBe("image-compress");
    expect(found!.fileKind).toBe("image");
    expect(found!.applied).toBe(3);
    expect(found!.pending.map((f) => f.id)).toEqual(["untouched"]);
  });

  it("does not call two repetitions a habit", () => {
    const files = [
      ...compressed("a", 1 * DAY),
      ...compressed("b", 2 * DAY),
      file({ id: "untouched", mime: "image/png", createdAt: 3 * DAY }),
    ];
    expect(habits(files, NOW)).toHaveLength(0);
  });

  it("says nothing when there is nothing left to apply it to", () => {
    const files = [...compressed("a", 1 * DAY), ...compressed("b", 2 * DAY), ...compressed("c", 3 * DAY)];
    expect(habits(files, NOW)).toHaveLength(0);
  });

  it("ignores an inconsistent mix", () => {
    const files = [
      ...compressed("a", 1 * DAY),
      ...compressed("b", 2 * DAY),
      file({ id: "c", mime: "image/png", createdAt: 3 * DAY }),
      file({ id: "c-out", createdAt: 3 * DAY + MIN, derivedFrom: { fileId: "c", toolId: "image-resize" } }),
      file({ id: "d", mime: "image/png", createdAt: 4 * DAY }),
      file({ id: "d-out", createdAt: 4 * DAY + MIN, derivedFrom: { fileId: "d", toolId: "image-crop" } }),
      file({ id: "untouched", mime: "image/png", createdAt: 5 * DAY }),
    ];
    expect(habits(files, NOW)).toHaveLength(0);
  });
});

/* ------------------------------------------------------------- aggregate */

describe("discover", () => {
  const files = [
    file({ id: "src", name: "report.docx", hash: "v1", createdAt: 1 * DAY }),
    file({
      id: "pdf",
      name: "report.pdf",
      createdAt: 2 * DAY,
      derivedFrom: { fileId: "src", toolId: "docx-to-pdf" },
    }),
    file({ id: "src2", name: "report.docx", hash: "v2", createdAt: 3 * DAY }),
  ];

  it("leads with the discovery that prevents a mistake", () => {
    const found = discover(files, [], { now: NOW });
    expect(found[0]!.kind).toBe("superseded-export");
  });

  /** The two would otherwise state the same fact in consecutive rows. */
  it("does not also report versions of a document it just said was superseded", () => {
    const found = discover(files, [], { now: NOW });
    expect(found.filter((d) => d.kind === "document-versions")).toHaveLength(0);
  });

  it("still reports versions of an unrelated document", () => {
    const contract = [
      file({ id: "k1", name: "contract.pdf", hash: "k1", createdAt: 1 * DAY }),
      file({ id: "k2", name: "contract v2.pdf", hash: "k2", createdAt: 2 * DAY }),
    ];
    const found = discover([...files, ...contract], [], { now: NOW });
    expect(found.filter((d) => d.kind === "document-versions")).toHaveLength(1);
  });

  it("honours a dismissal, and stays dismissed across recomputation", () => {
    const [first] = discover(files, [], { now: NOW });
    const after = discover(files, [], { now: NOW, dismissed: [first!.id] });
    expect(after.some((d) => d.id === first!.id)).toBe(false);
    // The same evidence must produce the same id, or dismissal would not stick.
    expect(discover(files, [], { now: NOW })[0]!.id).toBe(first!.id);
  });

  it("can silence a whole kind", () => {
    const found = discover(files, [], { now: NOW, dismissed: ["kind:superseded-export"] });
    expect(found.some((d) => d.kind === "superseded-export")).toBe(false);
  });

  it("stays a short list", () => {
    expect(discover(files, [], { now: NOW, limit: 0 })).toHaveLength(0);
  });

  it("says nothing about an empty workspace", () => {
    expect(discover([], [], { now: NOW })).toHaveLength(0);
  });
});
