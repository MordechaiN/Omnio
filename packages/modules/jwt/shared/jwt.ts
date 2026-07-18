/**
 * JSON Web Token decoder — on-device, decode only (no signature check).
 *
 * A JWT is three base64url segments: header.payload.signature. We decode the
 * first two to JSON. We do NOT verify the signature — that needs the signing
 * key and is a server concern; this tool inspects a token you already hold.
 */

export interface JwtClaim {
  key: string;
  value: string;
  /** Present for the registered time claims (exp, iat, nbf). */
  date?: string;
  /** For exp: true once the moment has passed. */
  expired?: boolean;
}

export interface JwtResult {
  ok: boolean;
  header?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  claims?: JwtClaim[];
  signature?: string;
  error?: string;
}

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const withPad = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(withPad);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

const TIME_CLAIMS = new Set(["exp", "iat", "nbf"]);

function toClaims(payload: Record<string, unknown>, now: number): JwtClaim[] {
  return Object.entries(payload).map(([key, raw]) => {
    const value = typeof raw === "object" ? JSON.stringify(raw) : String(raw);
    if (TIME_CLAIMS.has(key) && typeof raw === "number") {
      const date = new Date(raw * 1000).toISOString();
      return key === "exp"
        ? { key, value, date, expired: raw * 1000 < now }
        : { key, value, date };
    }
    return { key, value };
  });
}

export function decodeJwt(token: string, now: number = Date.now()): JwtResult {
  const trimmed = token.trim();
  if (trimmed === "") return { ok: true };
  const parts = trimmed.split(".");
  if (parts.length !== 3) {
    return { ok: false, error: "A JWT must have three dot-separated segments." };
  }
  try {
    const header = JSON.parse(base64UrlDecode(parts[0]!)) as Record<string, unknown>;
    const payload = JSON.parse(base64UrlDecode(parts[1]!)) as Record<string, unknown>;
    return {
      ok: true,
      header,
      payload,
      claims: toClaims(payload, now),
      signature: parts[2]!,
    };
  } catch {
    return { ok: false, error: "Segments are not valid base64url-encoded JSON." };
  }
}
