/**
 * Password + passphrase generation using crypto.getRandomValues (never
 * Math.random) — on-device. Character-class selection is unbiased via
 * rejection sampling; the passphrase mode joins words from a supplied list.
 */

export interface PasswordOptions {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  digits: boolean;
  symbols: boolean;
  /** Drop visually ambiguous characters (O/0, l/1/I, …). */
  avoidAmbiguous: boolean;
}

const SETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?/",
};

const AMBIGUOUS = new Set("O0oIl1|`'\"{}[]");

/** A uniform random integer in [0, max) via rejection sampling. */
export function randomInt(max: number): number {
  if (max <= 0) throw new RangeError("max must be positive");
  const limit = Math.floor(0xffffffff / max) * max;
  const buffer = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0]!;
  } while (value >= limit);
  return value % max;
}

export function buildAlphabet(options: PasswordOptions): string {
  let alphabet = "";
  if (options.lowercase) alphabet += SETS.lowercase;
  if (options.uppercase) alphabet += SETS.uppercase;
  if (options.digits) alphabet += SETS.digits;
  if (options.symbols) alphabet += SETS.symbols;
  if (options.avoidAmbiguous) {
    alphabet = [...alphabet].filter((character) => !AMBIGUOUS.has(character)).join("");
  }
  return alphabet;
}

export function generatePassword(options: PasswordOptions): string {
  const alphabet = buildAlphabet(options);
  if (alphabet.length === 0) return "";
  let password = "";
  for (let i = 0; i < options.length; i += 1) {
    password += alphabet[randomInt(alphabet.length)];
  }
  return password;
}

export function generatePassphrase(words: readonly string[], count: number, separator = "-"): string {
  if (words.length === 0) return "";
  const chosen: string[] = [];
  for (let i = 0; i < count; i += 1) chosen.push(words[randomInt(words.length)]!);
  return chosen.join(separator);
}

/** Shannon-ish strength estimate in bits: length × log2(alphabet size). */
export function entropyBits(alphabetSize: number, length: number): number {
  if (alphabetSize <= 1 || length <= 0) return 0;
  return Math.round(length * Math.log2(alphabetSize));
}
