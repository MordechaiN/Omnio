import { describe, expect, it } from "vitest";
import { cleanFilename } from "./filename.ts";

const plain = { lowercase: false, spacesToDashes: false };

describe("cleanFilename", () => {
  it("strips forbidden characters and keeps the extension", () => {
    expect(cleanFilename('report: "final" <v2>?.pdf', plain)).toBe("report final v2.pdf");
  });

  it("collapses whitespace and trims leading dots", () => {
    expect(cleanFilename("  ..my   file .txt", plain)).toBe("my file.txt");
  });

  it("applies dash and lowercase styles", () => {
    expect(cleanFilename("My Summer Photo.JPG", { lowercase: true, spacesToDashes: true })).toBe(
      "my-summer-photo.jpg",
    );
  });

  it("guards Windows reserved names and empty results", () => {
    expect(cleanFilename("CON.txt", plain)).toBe("CON-file.txt");
    expect(cleanFilename("???", plain)).toBe("file");
  });
});
