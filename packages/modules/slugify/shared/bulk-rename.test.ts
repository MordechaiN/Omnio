import { describe, expect, it } from "vitest";
import { applyRenameRules, type RenameRule } from "./bulk-rename.ts";

describe("applyRenameRules", () => {
  it("preserves the extension through all rules", () => {
    const rules: RenameRule[] = [{ type: "case", mode: "upper" }];
    expect(applyRenameRules(["photo.JPG"], rules)).toEqual(["PHOTO.JPG"]);
  });

  it("applies find/replace, plain and regex", () => {
    expect(
      applyRenameRules(["img copy.png"], [{ type: "findReplace", find: "copy", replace: "final", useRegex: false }]),
    ).toEqual(["img final.png"]);
    expect(
      applyRenameRules(["a1b2c3.txt"], [{ type: "findReplace", find: "\\d", replace: "", useRegex: true }]),
    ).toEqual(["abc.txt"]);
  });

  it("applies prefix, suffix, and sequence numbering", () => {
    const rules: RenameRule[] = [
      { type: "prefix", text: "IMG_" },
      { type: "sequence", start: 1, digits: 3, separator: "-" },
    ];
    expect(applyRenameRules(["a.png", "b.png"], rules)).toEqual(["IMG_a-001.png", "IMG_b-002.png"]);
  });

  it("chains multiple rules in order", () => {
    const rules: RenameRule[] = [
      { type: "case", mode: "lower" },
      { type: "findReplace", find: " ", replace: "-", useRegex: false },
      { type: "prefix", text: "2024-" },
    ];
    expect(applyRenameRules(["My Photo.JPG"], rules)).toEqual(["2024-my-photo.JPG"]);
  });

  it("handles names with no extension", () => {
    expect(applyRenameRules(["README"], [{ type: "suffix", text: "-old" }])).toEqual(["README-old"]);
  });
});
