import { describe, expect, it } from "vitest";
import { uppercaseText } from "./uppercase.ts";

describe("uppercaseText", () => {
  it("uppercases ASCII and Unicode", () => {
    expect(uppercaseText("omnio")).toBe("OMNIO");
    expect(uppercaseText("straße")).toBe("STRASSE");
  });

  it("is a no-op for already-uppercase text", () => {
    expect(uppercaseText("ABC 123")).toBe("ABC 123");
  });
});
