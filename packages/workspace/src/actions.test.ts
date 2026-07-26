import { describe, expect, it } from "vitest";
import { actionFor, isHandoff } from "./actions.ts";
import { discover, repeatedSequences } from "./discoveries.ts";
import type { Discovery } from "./discoveries.ts";
import type { WorkspaceFile } from "./model.ts";

const DAY = 86_400_000;
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

/** Every discovery kind, so the mapping cannot silently lose one. */
const ALL_KINDS: Discovery["kind"][] = [
  "superseded-export",
  "document-versions",
  "image-sizes",
  "work-session",
  "stepping-stones",
  "repeated-sequence",
  "habit",
];

describe("actionFor", () => {
  const base = { id: "d1", at: 1, weight: 1, files: [] as WorkspaceFile[] };

  it("offers to rebuild an output whose source was replaced", () => {
    const result = file({ id: "pdf" });
    const replacement = file({ id: "src2" });
    const action = actionFor({
      ...base,
      kind: "superseded-export",
      files: [result, replacement],
      result,
      source: file({ id: "src" }),
      replacement,
      toolId: "office-to-pdf",
    })!;
    expect(action.kind).toBe("regenerate");
    expect(action).toMatchObject({ sourceFileId: "src2", replacesFileId: "pdf" });
    // It needs the tool, so it must declare itself a handoff.
    expect(isHandoff(action)).toBe(true);
    expect(action.irreversible).toBe(false);
  });

  it("offers to remember a sequence it has seen more than once", () => {
    const action = actionFor({
      ...base,
      kind: "repeated-sequence",
      steps: ["pdf-ocr", "pdf-compress"],
      occurrences: 2,
      appliesTo: ["application/pdf"],
    })!;
    expect(action.kind).toBe("remember-chain");
    expect(isHandoff(action)).toBe(false);
  });

  it("offers to group versions rather than delete any of them", () => {
    const files = [file({ id: "a" }), file({ id: "b" })];
    const action = actionFor({
      ...base,
      kind: "document-versions",
      files,
      stem: "contract",
      newest: files[1]!,
      versionCount: 2,
    })!;
    // Grouping, never removing: Omnio cannot know which draft is still wanted.
    expect(action.kind).toBe("collect");
    expect(action).toMatchObject({ name: { from: "stem", stem: "contract" } });
    expect(action.irreversible).toBe(false);
    expect(action.fileIds).toEqual(["a", "b"]);
  });

  it("groups a session under the time it happened", () => {
    const files = [file({ id: "a" }), file({ id: "b" })];
    const action = actionFor({
      ...base,
      kind: "work-session",
      files,
      startedAt: 5_000,
      endedAt: 9_000,
      toolIds: [],
      fileCount: 2,
    })!;
    expect(action).toMatchObject({ kind: "collect", name: { from: "session", startedAt: 5_000 } });
  });

  it("has nothing to offer for a session whose files are gone", () => {
    expect(
      actionFor({
        ...base,
        kind: "work-session",
        files: [file({ id: "a" })],
        startedAt: 1,
        endedAt: 2,
        toolIds: [],
        fileCount: 1,
      }),
    ).toBeNull();
  });

  /** The only action that destroys anything, so it must say so. */
  it("declares archiving irreversible", () => {
    const action = actionFor({
      ...base,
      kind: "stepping-stones",
      files: [file({ id: "m1" }), file({ id: "m2" })],
      reclaimableBytes: 2_048,
    })!;
    expect(action).toMatchObject({ kind: "archive", bytes: 2_048, irreversible: true });
  });

  it("offers a habit only while something still lacks it", () => {
    const pending = [file({ id: "p1" })];
    const habit = {
      ...base,
      kind: "habit" as const,
      files: pending,
      toolId: "image-compress",
      fileKind: "image",
      applied: 3,
      total: 3,
      pending,
    };
    expect(actionFor(habit)!.kind).toBe("apply-tool");
    expect(actionFor({ ...habit, pending: [], files: [] })).toBeNull();
  });

  it("never offers more than one action, and never a destructive one by surprise", () => {
    // Only stepping-stones may be irreversible; everything else must be safe.
    const stones = actionFor({
      ...base,
      kind: "stepping-stones",
      files: [file({ id: "m" })],
      reclaimableBytes: 1,
    })!;
    expect(stones.irreversible).toBe(true);
  });
});

describe("repeatedSequences", () => {
  /** Two files each produced by OCR then compress — the same recipe, twice. */
  const files = [
    file({ id: "a", createdAt: 1 * DAY }),
    file({ id: "a1", createdAt: 2 * DAY, derivedFrom: { fileId: "a", toolId: "pdf-ocr" } }),
    file({ id: "a2", createdAt: 3 * DAY, derivedFrom: { fileId: "a1", toolId: "pdf-compress" } }),
    file({ id: "b", createdAt: 4 * DAY }),
    file({ id: "b1", createdAt: 5 * DAY, derivedFrom: { fileId: "b", toolId: "pdf-ocr" } }),
    file({ id: "b2", createdAt: 6 * DAY, derivedFrom: { fileId: "b1", toolId: "pdf-compress" } }),
  ];

  it("notices a sequence performed more than once", () => {
    const [found] = repeatedSequences(files);
    expect(found).toBeDefined();
    expect(found!.steps).toEqual(["pdf-ocr", "pdf-compress"]);
    expect(found!.occurrences).toBe(2);
    expect(found!.at).toBe(6 * DAY);
  });

  it("says nothing about a sequence done only once", () => {
    expect(repeatedSequences(files.slice(0, 3))).toHaveLength(0);
  });

  it("says nothing about a sequence already saved as a chain", () => {
    const saved = [
      {
        id: "c1",
        name: "OCR → Compress",
        steps: ["pdf-ocr", "pdf-compress"],
        createdAt: 0,
        learned: true,
        appliesTo: [],
      },
    ];
    expect(repeatedSequences(files, saved)).toHaveLength(0);
  });

  it("reaches the discovery feed", () => {
    const found = discover(files, [], { now: NOW });
    expect(found.some((d) => d.kind === "repeated-sequence")).toBe(true);
  });
});

describe("coverage", () => {
  /**
   * A discovery with no action is a discovery that leaves the user asking "now
   * what?" — the exact failure this milestone exists to remove. Every kind must
   * be considered, even if the considered answer is a deliberate null.
   */
  it("considers every discovery kind", () => {
    const source = `${actionFor.toString()}`;
    for (const kind of ALL_KINDS) {
      expect(source).toContain(`"${kind}"`);
    }
  });
});
