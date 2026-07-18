import { describe, expect, it } from "vitest";
import { convertBase, parseInRadix } from "./number-base.ts";

describe("number base", () => {
  it("converts decimal to all bases", () => {
    const r = convertBase("255", 10);
    expect(r.binary).toBe("11111111");
    expect(r.octal).toBe("377");
    expect(r.hex).toBe("ff");
  });

  it("parses hex into decimal", () => {
    expect(convertBase("ff", 16).decimal).toBe("255");
  });

  it("handles very large integers via BigInt", () => {
    const r = convertBase("ffffffffffffffff", 16);
    expect(r.decimal).toBe("18446744073709551615");
  });

  it("supports negative values", () => {
    expect(convertBase("-10", 10).hex).toBe("-a");
  });

  it("rejects illegal digits for the radix", () => {
    expect(convertBase("2", 2).ok).toBe(false);
    expect(parseInRadix("xyz", 16)).toBeNull();
  });
});
