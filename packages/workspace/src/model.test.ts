import { describe, expect, it } from "vitest";
import {
  ancestryOf,
  bytesHeld,
  duplicateGroups,
  kindOf,
  normalizeText,
  reclaimableBytes,
  relationsOf,
  searchFiles,
  selectForEviction,
  sortFiles,
  type WorkspaceFile,
} from "./model.ts";

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

describe("normalizeText / kindOf", () => {
  it("folds case and diacritics so search matches how people type", () => {
    expect(normalizeText("Café RÉSUMÉ")).toBe("cafe resume");
  });

  it("treats PDF as its own kind, not a generic application file", () => {
    expect(kindOf("application/pdf")).toBe("pdf");
  });

  it("buckets by mime major part", () => {
    expect(kindOf("image/png")).toBe("image");
    expect(kindOf("video/mp4")).toBe("video");
  });

  it("recognizes archives among application/* types", () => {
    expect(kindOf("application/zip")).toBe("archive");
  });

  it("falls back to other", () => {
    expect(kindOf("application/x-thing")).toBe("other");
  });
});

describe("searchFiles", () => {
  const files = [
    file({ id: "a", name: "Tax return 2025.pdf", tagIds: ["t1"], pinned: true }),
    file({ id: "b", name: "Café menu.png", mime: "image/png", tagIds: ["t1", "t2"] }),
    file({ id: "c", name: "notes.txt", mime: "text/plain", collectionIds: ["c1"] }),
  ];

  it("matches names case- and diacritic-insensitively", () => {
    expect(searchFiles(files, { text: "cafe" }).map((f) => f.id)).toEqual(["b"]);
  });

  it("requires every named tag, not any", () => {
    expect(searchFiles(files, { tagIds: ["t1", "t2"] }).map((f) => f.id)).toEqual(["b"]);
  });

  it("filters by kind", () => {
    expect(searchFiles(files, { kind: "pdf" }).map((f) => f.id)).toEqual(["a"]);
  });

  it("filters by collection", () => {
    expect(searchFiles(files, { collectionId: "c1" }).map((f) => f.id)).toEqual(["c"]);
  });

  it("ANDs clauses together", () => {
    expect(searchFiles(files, { text: "menu", kind: "pdf" })).toEqual([]);
  });

  it("returns everything for an empty query", () => {
    expect(searchFiles(files, {})).toHaveLength(3);
  });

  it("ignores whitespace-only text", () => {
    expect(searchFiles(files, { text: "   " })).toHaveLength(3);
  });
});

describe("sortFiles", () => {
  const files = [
    file({ id: "old", lastOpenedAt: 1, createdAt: 1, size: 300, name: "b" }),
    file({ id: "new", lastOpenedAt: 9, createdAt: 9, size: 100, name: "a" }),
    file({ id: "pin", lastOpenedAt: 0, createdAt: 0, size: 200, name: "c", pinned: true }),
  ];

  it("always leads with pinned files", () => {
    for (const key of ["recent", "created", "name", "size"] as const) {
      expect(sortFiles(files, key)[0]!.id).toBe("pin");
    }
  });

  it("orders by most recently opened", () => {
    expect(sortFiles(files, "recent").map((f) => f.id)).toEqual(["pin", "new", "old"]);
  });

  it("orders by name", () => {
    expect(sortFiles(files, "name").map((f) => f.id)).toEqual(["pin", "new", "old"]);
  });

  it("orders by size, largest first", () => {
    expect(sortFiles(files, "size").map((f) => f.id)).toEqual(["pin", "old", "new"]);
  });

  it("does not mutate its input", () => {
    const input = [...files];
    sortFiles(input, "name");
    expect(input.map((f) => f.id)).toEqual(files.map((f) => f.id));
  });
});

describe("duplicateGroups / reclaimableBytes", () => {
  const files = [
    file({ id: "a", hash: "same", createdAt: 1, size: 500 }),
    file({ id: "b", hash: "same", createdAt: 2, size: 500 }),
    file({ id: "c", hash: "same", createdAt: 3, size: 500 }),
    file({ id: "d", hash: "unique" }),
  ];

  it("groups by exact content hash, oldest first", () => {
    const groups = duplicateGroups(files);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.map((f) => f.id)).toEqual(["a", "b", "c"]);
  });

  it("ignores files with no duplicate", () => {
    expect(duplicateGroups([file({ id: "solo" })])).toEqual([]);
  });

  it("counts only the redundant copies as reclaimable", () => {
    expect(reclaimableBytes(files)).toBe(1000);
  });
});

describe("relationsOf / ancestryOf", () => {
  const scan = file({ id: "scan" });
  const ocr = file({ id: "ocr", derivedFrom: { fileId: "scan", toolId: "pdf-ocr" } });
  const signed = file({ id: "signed", derivedFrom: { fileId: "ocr", toolId: "pdf-edit" } });
  const compressed = file({ id: "small", derivedFrom: { fileId: "scan", toolId: "pdf-compress" } });
  const all = [scan, ocr, signed, compressed];

  it("finds the parent a file was produced from", () => {
    expect(relationsOf(ocr, all).parent?.id).toBe("scan");
  });

  it("finds files produced from this one", () => {
    expect(relationsOf(scan, all).children.map((f) => f.id)).toEqual(["ocr", "small"]);
  });

  it("finds siblings sharing a parent, excluding itself", () => {
    expect(relationsOf(ocr, all).siblings.map((f) => f.id)).toEqual(["small"]);
  });

  it("reports no parent for an imported file", () => {
    expect(relationsOf(scan, all).parent).toBeNull();
  });

  it("walks the whole chain oldest first", () => {
    expect(ancestryOf(signed, all).map((f) => f.id)).toEqual(["scan", "ocr"]);
  });

  it("terminates on a cycle rather than hanging", () => {
    const x = file({ id: "x", derivedFrom: { fileId: "y", toolId: "t" } });
    const y = file({ id: "y", derivedFrom: { fileId: "x", toolId: "t" } });
    expect(ancestryOf(x, [x, y]).length).toBeLessThanOrEqual(2);
  });
});

describe("selectForEviction", () => {
  it("returns nothing when already within budget", () => {
    expect(selectForEviction([file({ id: "a", size: 10 })], 100)).toEqual([]);
  });

  it("evicts least-recently-opened first, stopping once under budget", () => {
    const files = [
      file({ id: "old", size: 50, lastOpenedAt: 1 }),
      file({ id: "mid", size: 50, lastOpenedAt: 5 }),
      file({ id: "new", size: 50, lastOpenedAt: 9 }),
    ];
    expect(selectForEviction(files, 100)).toEqual(["old"]);
  });

  it("never evicts a pinned file, even as the oldest", () => {
    const files = [
      file({ id: "pinned-old", size: 50, lastOpenedAt: 0, pinned: true }),
      file({ id: "other", size: 50, lastOpenedAt: 9 }),
    ];
    expect(selectForEviction(files, 50)).toEqual(["other"]);
  });

  it("gives up rather than evicting pinned files it cannot free past", () => {
    const files = [file({ id: "p", size: 500, lastOpenedAt: 0, pinned: true })];
    expect(selectForEviction(files, 10)).toEqual([]);
  });

  it("ignores rows already evicted", () => {
    const files = [
      file({ id: "gone", size: 900, evicted: true }),
      file({ id: "here", size: 50 }),
    ];
    expect(selectForEviction(files, 100)).toEqual([]);
  });
});

describe("bytesHeld", () => {
  it("counts shared content once — storage is content-addressed", () => {
    const files = [
      file({ id: "a", hash: "same", size: 400 }),
      file({ id: "b", hash: "same", size: 400 }),
    ];
    expect(bytesHeld(files)).toBe(400);
  });

  it("excludes evicted rows", () => {
    expect(bytesHeld([file({ id: "a", size: 400, evicted: true })])).toBe(0);
  });
});
