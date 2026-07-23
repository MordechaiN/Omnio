import { describe, expect, it } from "vitest";
import { imageEntryName } from "./extract.ts";

describe("imageEntryName", () => {
  it("zero-pads the ordinal and keeps the base name", () => {
    expect(imageEntryName("report", 1, "png")).toBe("report-image-001.png");
    expect(imageEntryName("report", 42, "png")).toBe("report-image-042.png");
  });

  it("falls back to 'document' when the base is empty", () => {
    expect(imageEntryName("", 1, "png")).toBe("document-image-001.png");
  });

  it("respects the extension", () => {
    expect(imageEntryName("scan", 3, "jpg")).toBe("scan-image-003.jpg");
  });
});
