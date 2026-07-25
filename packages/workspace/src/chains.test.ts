import { describe, expect, it } from "vitest";
import {
  advanceRun,
  chainsFor,
  defaultChainName,
  isPrefix,
  learnChains,
  originOf,
  runProgress,
  stepsThatProduced,
  type Chain,
  type ChainRun,
} from "./chains.ts";
import type { WorkspaceFile } from "./model.ts";

function file(
  id: string,
  derivedFrom?: { fileId: string; toolId: string },
  mime = "application/pdf",
): WorkspaceFile {
  return {
    id,
    name: id,
    mime,
    size: 10,
    hash: `h-${id}`,
    createdAt: 0,
    lastOpenedAt: 0,
    pinned: false,
    tagIds: [],
    collectionIds: [],
    ...(derivedFrom ? { derivedFrom } : {}),
  };
}

/** scan → (ocr) → searchable → (compress) → small */
const scan = file("scan");
const searchable = file("searchable", { fileId: "scan", toolId: "pdf-ocr" });
const small = file("small", { fileId: "searchable", toolId: "pdf-compress" });
const chainFiles = [scan, searchable, small];

describe("stepsThatProduced", () => {
  it("reads the tool sequence out of the derivation, oldest first", () => {
    expect(stepsThatProduced(small, chainFiles)).toEqual(["pdf-ocr", "pdf-compress"]);
  });

  it("returns nothing for an imported file", () => {
    expect(stepsThatProduced(scan, chainFiles)).toEqual([]);
  });

  it("terminates on a cycle instead of hanging", () => {
    const a = file("a", { fileId: "b", toolId: "t1" });
    const b = file("b", { fileId: "a", toolId: "t2" });
    expect(stepsThatProduced(a, [a, b]).length).toBeLessThanOrEqual(2);
  });
});

describe("originOf", () => {
  it("walks back to the imported file", () => {
    expect(originOf(small, chainFiles).id).toBe("scan");
  });

  it("returns the file itself when it was imported", () => {
    expect(originOf(scan, chainFiles).id).toBe("scan");
  });
});

describe("learnChains", () => {
  it("learns a sequence from work already done", () => {
    const learned = learnChains(chainFiles);
    expect(learned).toHaveLength(1);
    expect(learned[0]!.steps).toEqual(["pdf-ocr", "pdf-compress"]);
    expect(learned[0]!.sourceMimes).toEqual(["application/pdf"]);
  });

  it("ignores intermediate results — only finished ones count", () => {
    // `searchable` is a midpoint; offering to stop there would be wrong.
    const learned = learnChains(chainFiles);
    expect(learned.some((c) => c.steps.join() === "pdf-ocr")).toBe(false);
  });

  it("does not treat a single tool run as a chain", () => {
    const once = [scan, file("out", { fileId: "scan", toolId: "pdf-ocr" })];
    expect(learnChains(once)).toEqual([]);
  });

  it("counts repeats of the same sequence across different files", () => {
    const scan2 = file("scan2");
    const searchable2 = file("s2", { fileId: "scan2", toolId: "pdf-ocr" });
    const small2 = file("small2", { fileId: "s2", toolId: "pdf-compress" });
    const learned = learnChains([...chainFiles, scan2, searchable2, small2]);
    expect(learned[0]!.occurrences).toBe(2);
  });

  it("can require a sequence to have happened more than once", () => {
    expect(learnChains(chainFiles, 2)).toEqual([]);
  });

  it("ranks the most repeated sequence first", () => {
    const extra = [
      file("x"),
      file("x1", { fileId: "x", toolId: "pdf-rotate" }),
      file("x2", { fileId: "x1", toolId: "pdf-crop" }),
      file("y"),
      file("y1", { fileId: "y", toolId: "pdf-rotate" }),
      file("y2", { fileId: "y1", toolId: "pdf-crop" }),
    ];
    const learned = learnChains([...chainFiles, ...extra]);
    expect(learned[0]!.steps).toEqual(["pdf-rotate", "pdf-crop"]);
  });
});

describe("isPrefix", () => {
  it("accepts the empty prefix", () => {
    expect(isPrefix([], ["a", "b"])).toBe(true);
  });

  it("rejects a longer prefix than the sequence", () => {
    expect(isPrefix(["a", "b", "c"], ["a", "b"])).toBe(false);
  });

  it("requires order to match", () => {
    expect(isPrefix(["b"], ["a", "b"])).toBe(false);
  });
});

describe("chainsFor", () => {
  const chain: Chain = {
    id: "c1",
    name: "OCR then compress",
    steps: ["pdf-ocr", "pdf-compress"],
    createdAt: 0,
    learned: true,
    appliesTo: ["application/pdf"],
  };

  it("offers the whole chain for an untouched file", () => {
    const offered = chainsFor(scan, chainFiles, [chain]);
    expect(offered[0]!.remaining).toEqual(["pdf-ocr", "pdf-compress"]);
  });

  it("offers only what is left when part of the work is done", () => {
    const offered = chainsFor(searchable, chainFiles, [chain]);
    expect(offered[0]!.remaining).toEqual(["pdf-compress"]);
  });

  it("offers nothing when the chain is already complete", () => {
    expect(chainsFor(small, chainFiles, [chain])).toEqual([]);
  });

  it("does not offer a chain for an unrelated file type", () => {
    const png = file("png", undefined, "image/png");
    expect(chainsFor(png, [png], [chain])).toEqual([]);
  });

  it("offers a chain with no type restriction to anything", () => {
    const anyChain: Chain = { ...chain, id: "c2", appliesTo: [] };
    const png = file("png", undefined, "image/png");
    expect(chainsFor(png, [png], [anyChain])).toHaveLength(1);
  });

  it("does not offer a chain whose earlier steps do not match what was done", () => {
    const diverged = file("d", { fileId: "scan", toolId: "pdf-rotate" });
    expect(chainsFor(diverged, [scan, diverged], [chain])).toEqual([]);
  });
});

describe("run progress", () => {
  const run: ChainRun = {
    chainId: "c1",
    name: "OCR then compress",
    steps: ["pdf-ocr", "pdf-compress"],
    position: 0,
    fileId: "scan",
    startedAt: 0,
  };

  it("advances to the next step carrying the produced file", () => {
    const next = advanceRun(run, "searchable")!;
    expect(next.position).toBe(1);
    expect(next.fileId).toBe("searchable");
  });

  it("finishes after the last step", () => {
    expect(advanceRun({ ...run, position: 1 }, "small")).toBeNull();
  });

  it("reports human progress from one, not zero", () => {
    expect(runProgress(run)).toEqual({ current: 1, total: 2, done: false });
  });
});

describe("defaultChainName", () => {
  it("joins resolved tool names with arrows", () => {
    const label = (id: string) => ({ "pdf-ocr": "OCR", "pdf-compress": "Compress" })[id] ?? "";
    expect(defaultChainName(["pdf-ocr", "pdf-compress"], label)).toBe("OCR → Compress");
  });

  it("falls back to the id rather than producing a blank name", () => {
    expect(defaultChainName(["mystery"], () => "")).toBe("mystery");
  });
});
