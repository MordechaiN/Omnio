import { describe, expect, it } from "vitest";
import { hashText, toHex } from "./hash.ts";

describe("hashText", () => {
  it("computes the known SHA-256 of 'abc'", async () => {
    expect(await hashText("abc", "SHA-256")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("computes the known SHA-1 of 'abc'", async () => {
    expect(await hashText("abc", "SHA-1")).toBe("a9993e364706816aba3e25717850c26c9cd0d89d");
  });

  it("hashes UTF-8 by bytes", async () => {
    const hebrew = await hashText("שלום", "SHA-256");
    expect(hebrew).toMatch(/^[0-9a-f]{64}$/);
  });

  it("toHex pads bytes", () => {
    expect(toHex(new Uint8Array([0, 15, 255]).buffer)).toBe("000fff");
  });
});
