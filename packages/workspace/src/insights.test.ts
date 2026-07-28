import { describe, expect, it } from "vitest";
import {
  insightsFor,
  isUnsafeArchiveName,
  primaryInsight,
  recentActivity,
  summarize,
  unfinishedWork,
} from "./insights.ts";
import type { FileFacts, WorkspaceEvent, WorkspaceFile } from "./model.ts";

function file(over: Partial<WorkspaceFile> & { id: string }): WorkspaceFile {
  return {
    name: over.id,
    mime: "image/png",
    size: 1000,
    hash: `h-${over.id}`,
    createdAt: 0,
    lastOpenedAt: 0,
    pinned: false,
    tagIds: [],
    collectionIds: [],
    ...over,
  };
}

const pdfFacts = (hasText: boolean): FileFacts => ({ kind: "pdf", pages: 3, hasText });

describe("insightsFor", () => {
  it("says nothing about an ordinary file", () => {
    expect(insightsFor(file({ id: "a", name: "notes.png" }))).toEqual([]);
  });

  it("recognizes a screen capture by name", () => {
    const [insight] = insightsFor(file({ id: "s", name: "Screenshot 2026-07-25.png" }));
    expect(insight?.kind).toBe("screenshot");
    expect(insight?.reason).toMatch(/screen capture/i);
  });

  it("recognizes the naming cameras and phones use", () => {
    expect(insightsFor(file({ id: "c", name: "IMG_4821.jpg", mime: "image/jpeg" }))[0]?.kind).toBe(
      "camera-photo",
    );
    expect(insightsFor(file({ id: "d", name: "DSC_0090.jpg", mime: "image/jpeg" }))[0]?.kind).toBe(
      "camera-photo",
    );
  });

  it("does not mistake an ordinary photo name for a camera file", () => {
    expect(insightsFor(file({ id: "e", name: "imgur-download.png" }))).toEqual([]);
  });

  it("calls a PDF with no selectable text a scan, and offers to make it searchable", () => {
    const [insight] = insightsFor(
      file({ id: "p", name: "contract.pdf", mime: "application/pdf", facts: pdfFacts(false) }),
    );
    expect(insight?.kind).toBe("scanned-document");
    expect(insight?.suggests).toBe("pdf-ocr");
  });

  it("says nothing about a PDF that does have text", () => {
    expect(
      insightsFor(file({ id: "p2", name: "report.pdf", mime: "application/pdf", facts: pdfFacts(true) })),
    ).toEqual([]);
  });

  it("does not guess about a PDF it has not inspected", () => {
    // No facts yet: silence is correct, a guess is not.
    expect(insightsFor(file({ id: "p3", name: "unknown.pdf", mime: "application/pdf" }))).toEqual([]);
  });

  it("reports identical content", () => {
    const a = file({ id: "a", hash: "same" });
    const b = file({ id: "b", hash: "same" });
    expect(insightsFor(a, [a, b]).some((i) => i.kind === "duplicate")).toBe(true);
  });

  it("does not report a duplicate when the file stands alone", () => {
    const a = file({ id: "a" });
    expect(insightsFor(a, [a]).some((i) => i.kind === "duplicate")).toBe(false);
  });

  it("notices an image far larger than any screen", () => {
    const huge = file({
      id: "h",
      name: "wall.png",
      facts: { kind: "image", width: 8000, height: 6000 },
    });
    expect(insightsFor(huge).some((i) => i.kind === "oversized-image")).toBe(true);
  });

  it("notices an awkwardly large file and suggests the matching compressor", () => {
    const big = file({ id: "b", name: "deck.pdf", mime: "application/pdf", size: 40 * 1024 * 1024 });
    const insight = insightsFor(big).find((i) => i.kind === "large-file");
    expect(insight?.suggests).toBe("pdf-compress");
  });

  it("ranks a scan above a size complaint — it is the more useful thing to say", () => {
    const scan = file({
      id: "s",
      name: "IMG_2001.pdf",
      mime: "application/pdf",
      size: 40 * 1024 * 1024,
      facts: pdfFacts(false),
    });
    expect(primaryInsight(scan)?.kind).toBe("scanned-document");
  });

  it("always explains itself", () => {
    const scan = file({ id: "s", mime: "application/pdf", facts: pdfFacts(false) });
    for (const insight of insightsFor(scan)) {
      expect(insight.reason.length).toBeGreaterThan(0);
    }
  });
});

describe("recentActivity", () => {
  it("puts the most recently touched first", () => {
    const files = [
      file({ id: "old", lastOpenedAt: 1 }),
      file({ id: "new", lastOpenedAt: 9 }),
      file({ id: "mid", lastOpenedAt: 5 }),
    ];
    expect(recentActivity(files).map((e) => e.file.id)).toEqual(["new", "mid", "old"]);
  });

  it("falls back to when a file arrived if it has never been opened", () => {
    const files = [file({ id: "a", lastOpenedAt: 0, createdAt: 7 })];
    expect(recentActivity(files)[0]!.at).toBe(7);
  });

  it("never offers to continue with a file whose contents are gone", () => {
    const files = [file({ id: "gone", evicted: true }), file({ id: "here" })];
    expect(recentActivity(files).map((e) => e.file.id)).toEqual(["here"]);
  });

  it("respects the limit", () => {
    expect(recentActivity(Array.from({ length: 20 }, (_, i) => file({ id: `f${i}` })), 5)).toHaveLength(5);
  });
});

describe("summarize", () => {
  it("counts shared content once", () => {
    const files = [file({ id: "a", hash: "same", size: 500 }), file({ id: "b", hash: "same", size: 500 })];
    expect(summarize(files).totalBytes).toBe(500);
  });

  it("reports what could be reclaimed", () => {
    const files = [file({ id: "a", hash: "s", size: 400 }), file({ id: "b", hash: "s", size: 400 })];
    const summary = summarize(files);
    expect(summary.duplicateGroups).toBe(1);
    expect(summary.reclaimableBytes).toBe(400);
  });
});

describe("unfinishedWork", () => {
  const HOUR = 60 * 60 * 1000;
  const now = 10 * HOUR;

  const opened = (fileId: string, toolId: string, at: number): WorkspaceEvent => ({
    id: `e-${fileId}-${at}`,
    fileId,
    type: "opened",
    toolId,
    at,
  });

  it("reports a file taken into a tool that produced nothing", () => {
    const files = [file({ id: "draft" })];
    const events = [opened("draft", "pdf-edit", now - HOUR)];
    const [work] = unfinishedWork(files, events, now);
    expect(work?.file.id).toBe("draft");
    expect(work?.toolId).toBe("pdf-edit");
  });

  it("says nothing when the work did produce something", () => {
    const files = [
      file({ id: "draft" }),
      file({ id: "out", derivedFrom: { fileId: "draft", toolId: "pdf-edit" } }),
    ];
    expect(unfinishedWork(files, [opened("draft", "pdf-edit", now - HOUR)], now)).toEqual([]);
  });

  it("does not nag about work still in progress", () => {
    const files = [file({ id: "draft" })];
    // Opened two minutes ago: the user is very likely still in the tool.
    expect(unfinishedWork(files, [opened("draft", "pdf-edit", now - 2 * 60 * 1000), ], now)).toEqual([]);
  });

  it("counts a different tool as separate unfinished work", () => {
    const files = [
      file({ id: "draft" }),
      file({ id: "out", derivedFrom: { fileId: "draft", toolId: "pdf-edit" } }),
    ];
    // Edited and kept, but also opened in rotate and abandoned.
    const [work] = unfinishedWork(files, [opened("draft", "pdf-rotate", now - HOUR)], now);
    expect(work?.toolId).toBe("pdf-rotate");
  });

  it("reports only the most recent attempt for a file", () => {
    const files = [file({ id: "draft" })];
    const events = [
      opened("draft", "pdf-edit", now - 5 * HOUR),
      opened("draft", "pdf-rotate", now - HOUR),
    ];
    const results = unfinishedWork(files, events, now);
    expect(results).toHaveLength(1);
    expect(results[0]!.toolId).toBe("pdf-rotate");
  });

  it("never offers work whose file contents are gone", () => {
    const files = [file({ id: "draft", evicted: true })];
    expect(unfinishedWork(files, [opened("draft", "pdf-edit", now - HOUR)], now)).toEqual([]);
  });

  it("puts the most recent first and respects the limit", () => {
    const files = ["a", "b", "c"].map((id) => file({ id }));
    const events = [
      opened("a", "t", now - 3 * HOUR),
      opened("b", "t", now - HOUR),
      opened("c", "t", now - 2 * HOUR),
    ];
    expect(unfinishedWork(files, events, now, 2).map((w) => w.file.id)).toEqual(["b", "c"]);
  });
});

describe("unfinishedWork dismissals", () => {
  const HOUR = 60 * 60 * 1000;
  const now = 10 * HOUR;
  const opened = (fileId: string, toolId: string): WorkspaceEvent => ({
    id: `e-${fileId}-${toolId}`,
    fileId,
    type: "opened",
    toolId,
    at: now - HOUR,
  });

  it("forgets a single item the user waved away", () => {
    const files = [file({ id: "a" })];
    expect(unfinishedWork(files, [opened("a", "pdf-edit")], now, 4, ["a:pdf-edit"])).toEqual([]);
  });

  it("keeps other work when one item is dismissed", () => {
    const files = [file({ id: "a" }), file({ id: "b" })];
    const events = [opened("a", "pdf-edit"), opened("b", "pdf-edit")];
    expect(
      unfinishedWork(files, events, now, 4, ["a:pdf-edit"]).map((w) => w.file.id),
    ).toEqual(["b"]);
  });

  it("can be told to stop tracking a kind of work entirely", () => {
    const files = [file({ id: "a" }), file({ id: "b" })];
    const events = [opened("a", "pdf-edit"), opened("b", "pdf-edit")];
    expect(unfinishedWork(files, events, now, 4, ["tool:pdf-edit"])).toEqual([]);
  });

  it("dismissing one tool does not silence another", () => {
    const files = [file({ id: "a" }), file({ id: "b" })];
    const events = [opened("a", "pdf-edit"), opened("b", "pdf-rotate")];
    expect(
      unfinishedWork(files, events, now, 4, ["tool:pdf-edit"]).map((w) => w.toolId),
    ).toEqual(["pdf-rotate"]);
  });
});

describe("archives that would escape the folder you unpack into", () => {
  const archive = (unsafeNames: string[]) => ({
    name: "shared.zip",
    mime: "application/zip",
    size: 4096,
    facts: { kind: "archive" as const, entries: 6, unsafeNames },
  });

  it("says so, at the top, when an entry would be written outside", () => {
    // Omnio always listed these names in the drop panel, in the same grey text
    // as readme.txt, and said nothing about them.
    const [first] = insightsFor(archive(["../../etc/passwd"]));
    expect(first?.kind).toBe("unsafe-archive");
    expect(first?.reason).toMatch(/outside the folder/i);
    expect(first?.suggests).toBe("zip-inspect");
  });

  it("outranks every other archive observation", () => {
    const insights = insightsFor({
      ...archive(["../escape"]),
      size: 80 * 1024 * 1024, // also a big archive
    });
    expect(insights[0]?.kind).toBe("unsafe-archive");
  });

  it("counts them rather than naming one and implying it is the only one", () => {
    const [first] = insightsFor(archive(["../a", "/etc/b", "..\\c"]));
    expect(first?.reason).toMatch(/^3 items/);
  });

  it("stays quiet about an ordinary archive", () => {
    const insights = insightsFor(archive([]));
    expect(insights.some((i) => i.kind === "unsafe-archive")).toBe(false);
  });
});

describe("isUnsafeArchiveName", () => {
  it("accepts ordinary names and catches escapes", () => {
    expect(isUnsafeArchiveName("docs/readme.txt")).toBe(false);
    expect(isUnsafeArchiveName("notes/...txt")).toBe(false);
    expect(isUnsafeArchiveName("../etc/passwd")).toBe(true);
    expect(isUnsafeArchiveName("/etc/passwd")).toBe(true);
    expect(isUnsafeArchiveName("C:\\Windows\\system32")).toBe(true);
    expect(isUnsafeArchiveName("a/../../b")).toBe(true);
  });
});
