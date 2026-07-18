/**
 * Integer base converter (2–36) — on-device, arbitrary size via BigInt.
 * Parsing is strict: digits must be legal for the source radix.
 */

export interface BaseResult {
  ok: boolean;
  /** Converted value in each common base, plus the requested target. */
  binary?: string;
  octal?: string;
  decimal?: string;
  hex?: string;
  error?: string;
}

const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";

export function parseInRadix(input: string, radix: number): bigint | null {
  const trimmed = input.trim().toLowerCase();
  if (trimmed === "") return null;
  const negative = trimmed.startsWith("-");
  const body = negative ? trimmed.slice(1) : trimmed;
  if (body === "") return null;
  let value = 0n;
  const big = BigInt(radix);
  for (const char of body) {
    const digit = DIGITS.indexOf(char);
    if (digit < 0 || digit >= radix) return null;
    value = value * big + BigInt(digit);
  }
  return negative ? -value : value;
}

export function convertBase(input: string, fromRadix: number): BaseResult {
  if (input.trim() === "") return { ok: true };
  const value = parseInRadix(input, fromRadix);
  if (value === null) {
    return { ok: false, error: `Not a valid base-${fromRadix} integer.` };
  }
  return {
    ok: true,
    binary: value.toString(2),
    octal: value.toString(8),
    decimal: value.toString(10),
    hex: value.toString(16),
  };
}
