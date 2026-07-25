import { describe, expect, it } from "vitest";
import {
  alreadyDone,
  arrivalGroups,
  arrivalGroupOf,
  recognize,
  recognizeByHash,
} from "./recognition.ts";
import type { WorkspaceEvent, WorkspaceFile } from "./model.ts";

const MIN = 60 * 1000;

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

describe("recognize", () => {
  /** The same scan, dropped again a week later. */
  const original = file({ id: "scan-old", hash: "same", createdAt: 1_000 });
  const searchable = file({
    id: "searchable",
    hash: "out",
    createdAt: 2_000,
    derivedFrom: { fileId: "scan-old", toolId: "pdf-ocr" },
  });
  const dropped = file({ id: "scan-new", hash: "same", createdAt: 9_000 });

  it("recognises bytes it has handled before, and what was made from them", () => {
    const found = recognize(dropped, [original, searchable, dropped])!;
    expect(found.original.id).toBe("scan-old");
    expect(found.firstSeenAt).toBe(1_000);
    expect(found.results).toHaveLength(1);
    expect(found.results[0]!.toolId).toBe("pdf-ocr");
    expect(found.results[0]!.file.id).toBe("searchable");
  });

  it("says nothing about a file it has never seen", () => {
    const fresh = file({ id: "fresh", hash: "unique", createdAt: 9_000 });
    expect(recognize(fresh, [original, searchable, fresh])).toBeNull();
  });

  it("says nothing when the same bytes exist but nothing was made from them", () => {
    const a = file({ id: "a", hash: "twin", createdAt: 1_000 });
    const b = file({ id: "b", hash: "twin", createdAt: 5_000 });
    expect(recognize(b, [a, b])).toBeNull();
  });

  it("does not tell the original copy about itself", () => {
    // Looking at the older file, there is nothing prior to recognise.
    expect(recognize(original, [original, searchable, dropped])).toBeNull();
  });

  it("never offers a result whose contents are gone", () => {
    const gone = { ...searchable, evicted: true };
    expect(recognize(dropped, [original, gone, dropped])).toBeNull();
  });

  it("prefers the event log's timestamp for when the work happened", () => {
    const events: WorkspaceEvent[] = [
      { id: "e1", fileId: "searchable", type: "produced", at: 4_242 },
    ];
    const found = recognize(dropped, [original, searchable, dropped], events)!;
    expect(found.results[0]!.at).toBe(4_242);
  });

  it("lists the most recent work first", () => {
    const compressed = file({
      id: "compressed",
      hash: "out2",
      createdAt: 3_000,
      derivedFrom: { fileId: "scan-old", toolId: "pdf-compress" },
    });
    const found = recognize(dropped, [original, searchable, compressed, dropped])!;
    expect(found.results.map((r) => r.toolId)).toEqual(["pdf-compress", "pdf-ocr"]);
  });

  it("follows results made from any copy of the same content", () => {
    // Work done on a second copy still counts: the content is what matters.
    const secondCopy = file({ id: "copy2", hash: "same", createdAt: 4_000 });
    const fromCopy = file({
      id: "from-copy",
      hash: "out3",
      createdAt: 5_000,
      derivedFrom: { fileId: "copy2", toolId: "pdf-rotate" },
    });
    const found = recognize(dropped, [original, secondCopy, fromCopy, dropped])!;
    expect(found.results.map((r) => r.toolId)).toContain("pdf-rotate");
  });
});

describe("alreadyDone", () => {
  const original = file({ id: "o", hash: "same", createdAt: 1_000 });
  const out = file({
    id: "out",
    hash: "x",
    createdAt: 2_000,
    derivedFrom: { fileId: "o", toolId: "pdf-ocr" },
  });
  const again = file({ id: "again", hash: "same", createdAt: 9_000 });
  const found = recognize(again, [original, out, again]);

  it("finds the finished file for a tool already run", () => {
    expect(alreadyDone(found, "pdf-ocr")?.file.id).toBe("out");
  });

  it("returns nothing for a tool never run on these bytes", () => {
    expect(alreadyDone(found, "pdf-compress")).toBeNull();
  });

  it("is safe when there is no recognition at all", () => {
    expect(alreadyDone(null, "pdf-ocr")).toBeNull();
  });
});

describe("arrivalGroups", () => {
  it("groups files that landed together", () => {
    const files = [
      file({ id: "a", createdAt: 0 }),
      file({ id: "b", createdAt: 2_000 }),
      file({ id: "c", createdAt: 5_000 }),
    ];
    const groups = arrivalGroups(files);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.files.map((f) => f.id)).toEqual(["a", "b", "c"]);
  });

  it("separates batches with a real gap between them", () => {
    const files = [
      file({ id: "a", createdAt: 0 }),
      file({ id: "b", createdAt: 1_000 }),
      file({ id: "c", createdAt: 10 * MIN }),
      file({ id: "d", createdAt: 10 * MIN + 1_000 }),
    ];
    expect(arrivalGroups(files).map((g) => g.files.map((f) => f.id))).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("does not call a single file a group", () => {
    expect(arrivalGroups([file({ id: "alone" })])).toEqual([]);
  });

  it("ignores files a tool produced — those did not arrive, they were made", () => {
    const files = [
      file({ id: "a", createdAt: 0 }),
      file({ id: "made", createdAt: 1_000, derivedFrom: { fileId: "a", toolId: "t" } }),
    ];
    expect(arrivalGroups(files)).toEqual([]);
  });

  it("finds the group a file belongs to", () => {
    const files = [file({ id: "a", createdAt: 0 }), file({ id: "b", createdAt: 1_000 })];
    expect(arrivalGroupOf(files[1]!, files)?.files).toHaveLength(2);
  });
});

describe("recognizeByHash", () => {
  const original = file({ id: "o", hash: "same", createdAt: 1_000 });
  const made = file({
    id: "made",
    hash: "out",
    createdAt: 2_000,
    derivedFrom: { fileId: "o", toolId: "pdf-ocr" },
  });

  it("recognises incoming bytes before they are a workspace file", () => {
    // The drop has not been imported yet — only the hash is known.
    const found = recognizeByHash("same", [original, made])!;
    expect(found.results[0]!.toolId).toBe("pdf-ocr");
    expect(found.original.id).toBe("o");
  });

  it("says nothing about unfamiliar bytes", () => {
    expect(recognizeByHash("never-seen", [original, made])).toBeNull();
  });

  it("says nothing when nothing was ever made from those bytes", () => {
    expect(recognizeByHash("same", [original])).toBeNull();
  });
});
