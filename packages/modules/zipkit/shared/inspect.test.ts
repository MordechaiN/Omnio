import { describe, expect, it } from "vitest";
import { isUnsafeName, summarize, topLevelFolders, type ArchiveEntry } from "./inspect.ts";

const entry = (name: string, packed: number, unpacked: number): ArchiveEntry => ({
  name,
  packed,
  unpacked,
});

describe("isUnsafeName", () => {
  it("accepts ordinary nested names", () => {
    expect(isUnsafeName("docs/readme.txt")).toBe(false);
    expect(isUnsafeName("a/b/c.png")).toBe(false);
    // "..." and "..txt" are not traversal, however much they look it.
    expect(isUnsafeName("notes/...txt")).toBe(false);
  });

  it("catches names that would escape the destination", () => {
    expect(isUnsafeName("../etc/passwd")).toBe(true);
    expect(isUnsafeName("docs/../../secret")).toBe(true);
    expect(isUnsafeName("/etc/passwd")).toBe(true);
    expect(isUnsafeName("..\\windows\\win.ini")).toBe(true);
    expect(isUnsafeName("C:\\Windows\\system32")).toBe(true);
  });
});

describe("summarize", () => {
  const entries = [
    entry("photos/", 0, 0),
    entry("photos/a.jpg", 900_000, 900_000),
    entry("photos/b.jpg", 800_000, 800_000),
    entry("notes.txt", 200, 1_000),
  ];

  it("counts files and folders separately", () => {
    const s = summarize(entries);
    expect(s.fileCount).toBe(3);
    expect(s.folderCount).toBe(1);
  });

  it("measures both sizes without needing the contents", () => {
    const s = summarize(entries);
    expect(s.packedBytes).toBe(1_700_200);
    expect(s.unpackedBytes).toBe(1_701_000);
    expect(s.ratio).toBeCloseTo(0.9995, 4);
  });

  it("ranks the largest entries by their unpacked size", () => {
    expect(summarize(entries).largest.map((e) => e.name)).toEqual([
      "photos/a.jpg",
      "photos/b.jpg",
      "notes.txt",
    ]);
  });

  it("notices entries stored without compression", () => {
    // The two JPEGs did not shrink; the text file did.
    expect(summarize(entries).storedCount).toBe(2);
  });

  it("reports names that would escape the destination", () => {
    expect(summarize([entry("../escape.sh", 10, 10)]).unsafe).toEqual(["../escape.sh"]);
    expect(summarize(entries).unsafe).toEqual([]);
  });

  it("survives an empty archive without dividing by zero", () => {
    const s = summarize([]);
    expect(s.fileCount).toBe(0);
    expect(s.ratio).toBeNull();
  });

  it("describes a decompression bomb instead of trying to measure it", () => {
    // 1 MB that claims to become 40 GB. Nothing here inflates anything, so the
    // summary is instant and truthful rather than a dead tab.
    const bomb = summarize([entry("bomb.bin", 1_000_000, 40_000_000_000)]);
    expect(bomb.unpackedBytes).toBe(40_000_000_000);
    expect(bomb.ratio).toBeCloseTo(0.000025, 6);
  });
});

describe("topLevelFolders", () => {
  it("lists each first-level folder once, in order of appearance", () => {
    expect(
      topLevelFolders([
        entry("src/a.ts", 1, 1),
        entry("src/b.ts", 1, 1),
        entry("docs/c.md", 1, 1),
        entry("root.txt", 1, 1),
      ]),
    ).toEqual(["src", "docs"]);
  });
});
