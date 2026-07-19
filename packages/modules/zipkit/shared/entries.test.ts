import { describe, expect, it } from "vitest";
import { archiveName, downloadName, sanitizeEntryName } from "./entries.ts";

describe("sanitizeEntryName", () => {
  it("keeps normal nested paths", () => {
    expect(sanitizeEntryName("docs/readme.txt")).toBe("docs/readme.txt");
  });

  it("drops directory entries", () => {
    expect(sanitizeEntryName("docs/")).toBeNull();
  });

  it("neutralizes traversal and absolute paths", () => {
    expect(sanitizeEntryName("../../etc/passwd")).toBe("etc/passwd");
    expect(sanitizeEntryName("/etc/passwd")).toBe("etc/passwd");
    expect(sanitizeEntryName("..\\..\\win.ini")).toBe("win.ini");
    expect(sanitizeEntryName("a/./b")).toBe("a/b");
  });

  it("rejects names that vanish entirely", () => {
    expect(sanitizeEntryName("..")).toBeNull();
    expect(sanitizeEntryName("//")).toBeNull();
  });
});

describe("downloadName", () => {
  it("takes the basename", () => {
    expect(downloadName("docs/readme.txt")).toBe("readme.txt");
    expect(downloadName("flat.png")).toBe("flat.png");
  });
});

describe("archiveName", () => {
  it("normalizes user input", () => {
    expect(archiveName("photos")).toBe("photos.zip");
    expect(archiveName("photos.ZIP")).toBe("photos.zip");
    expect(archiveName("  ")).toBe("archive.zip");
  });
});
