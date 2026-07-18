import { describe, expect, it } from "vitest";
import { binaryToText, runTextBinary, textToBinary } from "./text-binary.ts";

describe("text ⇄ binary", () => {
  it("encodes ASCII to 8-bit groups", () => {
    expect(textToBinary("A")).toBe("01000001");
    expect(textToBinary("Hi")).toBe("01001000 01101001");
  });

  it("round-trips UTF-8", () => {
    const bin = textToBinary("שלום");
    expect(binaryToText(bin).output).toBe("שלום");
  });

  it("decodes ignoring separators", () => {
    expect(binaryToText("01001000-01101001").output).toBe("Hi");
  });

  it("rejects a non-multiple-of-8 length", () => {
    expect(binaryToText("0100").ok).toBe(false);
  });

  it("runTextBinary handles empty input", () => {
    expect(runTextBinary("decode", "")).toEqual({ ok: true, output: "" });
  });
});
