/**
 * Cryptographic hashing via the Web Crypto SubtleCrypto API — on-device, no
 * upload. Only algorithms the platform implements natively are offered
 * (SHA-1, SHA-256, SHA-384, SHA-512); MD5 is deliberately omitted (not in
 * SubtleCrypto, and broken anyway).
 */

export const HASH_ALGORITHMS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const;
export type HashAlgorithm = (typeof HASH_ALGORITHMS)[number];

const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));

export function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = "";
  for (const byte of bytes) out += HEX[byte];
  return out;
}

export async function hashText(text: string, algorithm: HashAlgorithm): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest(algorithm, data);
  return toHex(digest);
}

export async function hashAll(text: string): Promise<Record<HashAlgorithm, string>> {
  const entries = await Promise.all(
    HASH_ALGORITHMS.map(async (algorithm) => [algorithm, await hashText(text, algorithm)] as const),
  );
  return Object.fromEntries(entries) as Record<HashAlgorithm, string>;
}
