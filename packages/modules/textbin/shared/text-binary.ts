/**
 * Text ⇄ binary — on-device, UTF-8 aware. Encoding emits space-separated
 * 8-bit groups for each byte of the UTF-8 encoding; decoding accepts any
 * run of 0/1 grouped in 8s (whitespace between groups optional).
 */

export type BinMode = "encode" | "decode";

export interface BinResult {
  ok: boolean;
  output: string;
  error?: string;
}

export function textToBinary(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return Array.from(bytes, (byte) => byte.toString(2).padStart(8, "0")).join(" ");
}

export function binaryToText(input: string): BinResult {
  const bits = input.replace(/[^01]/g, "");
  if (bits.length === 0) return { ok: true, output: "" };
  if (bits.length % 8 !== 0) {
    return { ok: false, output: "", error: "Binary length must be a multiple of 8 bits." };
  }
  const bytes = new Uint8Array(bits.length / 8);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  try {
    return { ok: true, output: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, output: "", error: "Bits do not decode to valid UTF-8 text." };
  }
}

export function runTextBinary(mode: BinMode, input: string): BinResult {
  if (input === "") return { ok: true, output: "" };
  return mode === "encode" ? { ok: true, output: textToBinary(input) } : binaryToText(input);
}
