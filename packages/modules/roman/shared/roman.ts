/**
 * Roman numeral converter — on-device, classic subtractive notation.
 *
 * Supports 1–3999 (the range expressible without vinculum/overbar). Parsing is
 * strict: it re-encodes the parsed value and rejects the input unless it round
 * trips, so malformed numerals like "IIII" or "IC" are refused.
 */

const NUMERALS: Array<[number, string]> = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

const VALUES: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

export interface RomanResult {
  ok: boolean;
  value?: string | number;
  error?: string;
}

export function toRoman(input: number): RomanResult {
  if (!Number.isInteger(input)) return { ok: false, error: "Enter a whole number." };
  if (input < 1 || input > 3999) return { ok: false, error: "Number must be between 1 and 3999." };
  let n = input;
  let out = "";
  for (const [value, symbol] of NUMERALS) {
    while (n >= value) {
      out += symbol;
      n -= value;
    }
  }
  return { ok: true, value: out };
}

export function fromRoman(input: string): RomanResult {
  const text = input.trim().toUpperCase();
  if (text === "") return { ok: true };
  if (!/^[IVXLCDM]+$/.test(text)) return { ok: false, error: "Use only the letters I V X L C D M." };
  let total = 0;
  for (let i = 0; i < text.length; i += 1) {
    const current = VALUES[text[i]!]!;
    const next = i + 1 < text.length ? VALUES[text[i + 1]!]! : 0;
    total += current < next ? -current : current;
  }
  const check = toRoman(total);
  if (!check.ok || check.value !== text) {
    return { ok: false, error: "That is not a valid Roman numeral." };
  }
  return { ok: true, value: total };
}
