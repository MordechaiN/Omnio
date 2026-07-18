import { describe, expect, it } from "vitest";
import { decodeBase64, encodeBase64, runBase64 } from "./base64.ts";

describe("base64", () => {
  it("encodes ASCII", () => {
    expect(encodeBase64("hello")).toBe("aGVsbG8=");
  });

  it("round-trips UTF-8 (Hebrew + emoji)", () => {
    const text = "שלום 👋";
    const encoded = encodeBase64(text);
    const decoded = decodeBase64(encoded);
    expect(decoded.ok).toBe(true);
    expect(decoded.output).toBe(text);
  });

  it("produces url-safe output without padding", () => {
    const encoded = encodeBase64("<<???>>", true);
    expect(encoded).not.toMatch(/[+/=]/);
    expect(decodeBase64(encoded, true).output).toBe("<<???>>");
  });

  it("reports invalid base64", () => {
    const result = decodeBase64("not valid !!!");
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("runBase64 returns empty for empty input", () => {
    expect(runBase64("encode", "")).toEqual({ ok: true, output: "" });
  });
});
