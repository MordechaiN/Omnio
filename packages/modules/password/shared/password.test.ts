import { describe, expect, it } from "vitest";
import {
  buildAlphabet,
  entropyBits,
  generatePassphrase,
  generatePassword,
  randomInt,
  type PasswordOptions,
} from "./password.ts";
import { WORDS } from "./words.ts";

const base: PasswordOptions = {
  length: 16,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: false,
  avoidAmbiguous: false,
};

describe("password generation", () => {
  it("produces a password of the requested length", () => {
    expect(generatePassword(base)).toHaveLength(16);
  });

  it("only uses characters from the selected classes", () => {
    const digitsOnly = generatePassword({ ...base, lowercase: false, uppercase: false });
    expect(digitsOnly).toMatch(/^[0-9]+$/);
  });

  it("drops ambiguous characters when asked", () => {
    const alphabet = buildAlphabet({ ...base, symbols: true, avoidAmbiguous: true });
    expect(alphabet).not.toMatch(/[O0l1I]/);
  });

  it("returns empty when no class is selected", () => {
    expect(
      generatePassword({ ...base, lowercase: false, uppercase: false, digits: false }),
    ).toBe("");
  });

  it("randomInt stays in range and is reasonably distributed", () => {
    const counts = new Array(6).fill(0);
    for (let i = 0; i < 600; i += 1) counts[randomInt(6)] += 1;
    expect(counts.every((c) => c > 40)).toBe(true);
  });

  it("builds a passphrase of N words", () => {
    const phrase = generatePassphrase(WORDS, 4);
    expect(phrase.split("-")).toHaveLength(4);
  });

  it("estimates entropy", () => {
    expect(entropyBits(26, 10)).toBe(47);
    expect(entropyBits(1, 10)).toBe(0);
  });
});
