import { describe, expect, it } from "vitest";
import { runUrl } from "./url-encode.ts";

describe("runUrl", () => {
  it("encodes a query component", () => {
    expect(runUrl("encode", "component", "a b&c=d").output).toBe("a%20b%26c%3Dd");
  });

  it("preserves URL structure in full mode", () => {
    expect(runUrl("encode", "full", "https://x.com/a b").output).toBe("https://x.com/a%20b");
  });

  it("decodes a component, treating + as space", () => {
    expect(runUrl("decode", "component", "a+b%26c").output).toBe("a b&c");
  });

  it("round-trips Hebrew", () => {
    const encoded = runUrl("encode", "component", "שלום").output;
    expect(runUrl("decode", "component", encoded).output).toBe("שלום");
  });

  it("reports malformed input", () => {
    const result = runUrl("decode", "component", "%zz");
    expect(result.ok).toBe(false);
  });
});
