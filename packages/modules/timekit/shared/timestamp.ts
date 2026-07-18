/**
 * Unix timestamp ⇄ date converter — on-device.
 *
 * Auto-detects seconds vs milliseconds by magnitude (10-digit values and below
 * are treated as seconds). Human dates are parsed with the platform Date, so
 * ISO 8601 works everywhere; the result exposes both epoch units.
 */

export interface FromUnixResult {
  ok: boolean;
  iso?: string;
  utc?: string;
  seconds?: number;
  milliseconds?: number;
  error?: string;
}

export interface ToUnixResult {
  ok: boolean;
  seconds?: number;
  milliseconds?: number;
  iso?: string;
  error?: string;
}

/** Interpret a numeric timestamp, guessing s vs ms by digit count. */
export function fromUnix(input: string): FromUnixResult {
  const trimmed = input.trim();
  if (trimmed === "") return { ok: true };
  if (!/^-?\d+$/.test(trimmed)) return { ok: false, error: "Enter a whole number of seconds or ms." };
  const raw = Number(trimmed);
  const ms = Math.abs(raw) >= 1e12 ? raw : raw * 1000;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return { ok: false, error: "Timestamp is out of range." };
  return {
    ok: true,
    iso: date.toISOString(),
    utc: date.toUTCString(),
    seconds: Math.floor(ms / 1000),
    milliseconds: ms,
  };
}

/** Parse a human/ISO date string into epoch units. */
export function toUnix(input: string): ToUnixResult {
  const trimmed = input.trim();
  if (trimmed === "") return { ok: true };
  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) return { ok: false, error: "Could not parse that date." };
  return {
    ok: true,
    seconds: Math.floor(ms / 1000),
    milliseconds: ms,
    iso: new Date(ms).toISOString(),
  };
}

export function nowSeconds(now: number = Date.now()): number {
  return Math.floor(now / 1000);
}
