/**
 * Base64 encode/decode — UTF-8 safe, on-device. We go through TextEncoder/
 * TextDecoder rather than raw btoa/atob so multi-byte characters (emoji,
 * Hebrew, …) round-trip correctly. Optional URL-safe alphabet (RFC 4648 §5).
 */

export type Base64Mode = "encode" | "decode";

export interface Base64Result {
  ok: boolean;
  output: string;
  error?: string;
}

function toUrlSafe(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromUrlSafe(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/").trim();
  const padding = normalized.length % 4;
  return padding === 0 ? normalized : normalized + "=".repeat(4 - padding);
}

export function encodeBase64(text: string, urlSafe = false): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = btoa(binary);
  return urlSafe ? toUrlSafe(base64) : base64;
}

export function decodeBase64(input: string, urlSafe = false): Base64Result {
  const source = urlSafe ? fromUrlSafe(input) : input.trim();
  try {
    const binary = atob(source);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return { ok: true, output: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, output: "", error: "Not valid Base64 (or not UTF-8 text)." };
  }
}

export function runBase64(mode: Base64Mode, input: string, urlSafe = false): Base64Result {
  if (input.trim() === "") return { ok: true, output: "" };
  return mode === "encode"
    ? { ok: true, output: encodeBase64(input, urlSafe) }
    : decodeBase64(input, urlSafe);
}
