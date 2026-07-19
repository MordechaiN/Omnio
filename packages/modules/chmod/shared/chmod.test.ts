import { describe, expect, it } from "vitest";
import {
  emptyMode,
  modeToOctal,
  modeToSymbolic,
  octalToMode,
  symbolicToMode,
} from "./chmod.ts";

describe("chmod conversions", () => {
  it("converts octal to mode and back", () => {
    const mode = octalToMode("754")!;
    expect(mode.owner).toEqual({ read: true, write: true, execute: true });
    expect(mode.group).toEqual({ read: true, write: false, execute: true });
    expect(mode.others).toEqual({ read: true, write: false, execute: false });
    expect(modeToOctal(mode)).toBe("754");
  });

  it("converts mode to symbolic", () => {
    expect(modeToSymbolic(octalToMode("754")!)).toBe("rwxr-xr--");
    expect(modeToSymbolic(octalToMode("000")!)).toBe("---------");
    expect(modeToSymbolic(octalToMode("777")!)).toBe("rwxrwxrwx");
  });

  it("parses symbolic strings", () => {
    expect(modeToOctal(symbolicToMode("rw-r--r--")!)).toBe("644");
    expect(modeToOctal(symbolicToMode("rwx------")!)).toBe("700");
  });

  it("round-trips every octal value", () => {
    for (let a = 0; a <= 7; a += 1)
      for (let b = 0; b <= 7; b += 1)
        for (let c = 0; c <= 7; c += 1) {
          const octal = `${a}${b}${c}`;
          const mode = octalToMode(octal)!;
          expect(modeToOctal(mode)).toBe(octal);
          expect(modeToOctal(symbolicToMode(modeToSymbolic(mode))!)).toBe(octal);
        }
  });

  it("rejects malformed input", () => {
    expect(octalToMode("75")).toBeNull();
    expect(octalToMode("758")).toBeNull();
    expect(octalToMode("0754")).toBeNull();
    expect(symbolicToMode("rwxr-xr-")).toBeNull();
    expect(symbolicToMode("rwxr-xr-q")).toBeNull();
    expect(symbolicToMode("xwrr-xr--")).toBeNull();
  });

  it("starts empty", () => {
    expect(modeToOctal(emptyMode())).toBe("000");
  });
});
