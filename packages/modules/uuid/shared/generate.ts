import type { UuidVersion } from "./options.ts";

const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));

function format(bytes: Uint8Array): string {
  const h = (i: number): string => HEX[bytes[i]!]!;
  return (
    `${h(0)}${h(1)}${h(2)}${h(3)}-${h(4)}${h(5)}-${h(6)}${h(7)}-` +
    `${h(8)}${h(9)}-${h(10)}${h(11)}${h(12)}${h(13)}${h(14)}${h(15)}`
  );
}

/** RFC 9562 UUIDv7: 48-bit big-endian timestamp + random, version/variant bits set. */
function uuidV7(now: number): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let ts = now;
  for (let i = 5; i >= 0; i -= 1) {
    bytes[i] = ts & 0xff;
    ts = Math.floor(ts / 256);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return format(bytes);
}

export function generateUuid(version: UuidVersion, now: number = Date.now()): string {
  return version === "v7" ? uuidV7(now) : crypto.randomUUID();
}

export function generateUuids(count: number, version: UuidVersion): string[] {
  return Array.from({ length: count }, () => generateUuid(version));
}
