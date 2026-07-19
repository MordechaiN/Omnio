/**
 * IP address parsing and classification, on-device. IPv4 addresses are parsed
 * from dotted-quad notation into a 32-bit value with alternate notations
 * (integer, hex, binary) and an RFC-based classification. IPv6 addresses are
 * normalized between expanded and compressed forms per RFC 5952.
 */

export type Ipv4Kind =
  | "private"
  | "loopback"
  | "linkLocal"
  | "multicast"
  | "broadcast"
  | "unspecified"
  | "cgnat"
  | "documentation"
  | "public";

export interface Ipv4Info {
  version: 4;
  octets: [number, number, number, number];
  /** Unsigned 32-bit integer value. */
  integer: number;
  hex: string;
  binary: string;
  kind: Ipv4Kind;
}

export interface Ipv6Info {
  version: 6;
  /** Eight 16-bit groups. */
  groups: number[];
  expanded: string;
  compressed: string;
  kind: "loopback" | "unspecified" | "linkLocal" | "uniqueLocal" | "multicast" | "documentation" | "global";
}

export function parseIpv4(text: string): Ipv4Info | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(text.trim());
  if (!match) return null;
  const octets = match.slice(1).map(Number) as [number, number, number, number];
  if (octets.some((o) => o > 255)) return null;
  // Reject leading zeros ("01.2.3.4") — ambiguous octal in many parsers.
  if (match.slice(1).some((part) => part.length > 1 && part.startsWith("0"))) return null;

  const integer = ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
  const [a, b] = octets;

  let kind: Ipv4Kind = "public";
  if (integer === 0xffffffff) kind = "broadcast";
  else if (integer === 0) kind = "unspecified";
  else if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) kind = "private";
  else if (a === 127) kind = "loopback";
  else if (a === 169 && b === 254) kind = "linkLocal";
  else if (a >= 224 && a <= 239) kind = "multicast";
  else if (a === 100 && b >= 64 && b <= 127) kind = "cgnat";
  else if (
    (a === 192 && b === 0 && octets[2] === 2) ||
    (a === 198 && b === 51 && octets[2] === 100) ||
    (a === 203 && b === 0 && octets[2] === 113)
  )
    kind = "documentation";

  return {
    version: 4,
    octets,
    integer,
    hex: `0x${integer.toString(16).toUpperCase().padStart(8, "0")}`,
    binary: octets.map((o) => o.toString(2).padStart(8, "0")).join("."),
    kind,
  };
}

function classifyIpv6(groups: number[]): Ipv6Info["kind"] {
  const isZero = groups.every((g) => g === 0);
  if (isZero) return "unspecified";
  if (groups.slice(0, 7).every((g) => g === 0) && groups[7] === 1) return "loopback";
  const first = groups[0]!;
  if ((first & 0xffc0) === 0xfe80) return "linkLocal";
  if ((first & 0xfe00) === 0xfc00) return "uniqueLocal";
  if ((first & 0xff00) === 0xff00) return "multicast";
  if (first === 0x2001 && groups[1] === 0x0db8) return "documentation";
  return "global";
}

export function parseIpv6(text: string): Ipv6Info | null {
  const raw = text.trim().toLowerCase();
  if (raw.includes(".")) return null; // embedded-IPv4 forms out of scope
  if (!/^[0-9a-f:]+$/.test(raw)) return null;
  if (raw.includes(":::")) return null;

  const doubleColons = raw.split("::").length - 1;
  if (doubleColons > 1) return null;

  let groups: string[];
  if (doubleColons === 1) {
    const [head = "", tail = ""] = raw.split("::");
    const headParts = head === "" ? [] : head.split(":");
    const tailParts = tail === "" ? [] : tail.split(":");
    const missing = 8 - headParts.length - tailParts.length;
    if (missing < 1) return null;
    groups = [...headParts, ...Array<string>(missing).fill("0"), ...tailParts];
  } else {
    groups = raw.split(":");
  }
  if (groups.length !== 8 || groups.some((g) => g === "" || g.length > 4)) return null;

  const values = groups.map((g) => Number.parseInt(g, 16));
  const expanded = values.map((v) => v.toString(16).padStart(4, "0")).join(":");

  // RFC 5952 compression: shorten the longest run (≥2) of zero groups.
  let bestStart = -1;
  let bestLength = 0;
  for (let i = 0; i < 8; i += 1) {
    if (values[i] !== 0) continue;
    let j = i;
    while (j < 8 && values[j] === 0) j += 1;
    if (j - i > bestLength) {
      bestStart = i;
      bestLength = j - i;
    }
    i = j;
  }
  let compressed: string;
  if (bestLength >= 2) {
    const head = values.slice(0, bestStart).map((v) => v.toString(16)).join(":");
    const tail = values.slice(bestStart + bestLength).map((v) => v.toString(16)).join(":");
    compressed = `${head}::${tail}`;
  } else {
    compressed = values.map((v) => v.toString(16)).join(":");
  }

  return { version: 6, groups: values, expanded, compressed, kind: classifyIpv6(values) };
}

export function parseIp(text: string): Ipv4Info | Ipv6Info | null {
  return parseIpv4(text) ?? parseIpv6(text);
}
