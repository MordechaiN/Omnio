/**
 * IPv4 CIDR calculator — on-device.
 *
 * Parses `a.b.c.d/prefix`, then derives the network, broadcast, mask, host
 * range and counts with plain 32-bit integer math. Unsigned shifts (`>>> 0`)
 * keep every intermediate in the 0…2³²−1 range so the dotted output is always
 * correct.
 */

export interface CidrResult {
  ok: boolean;
  networkAddress?: string;
  broadcastAddress?: string;
  netmask?: string;
  wildcard?: string;
  firstHost?: string;
  lastHost?: string;
  totalHosts?: number;
  usableHosts?: number;
  prefix?: number;
  error?: string;
}

function parseOctets(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = (value << 8) | n;
  }
  return value >>> 0;
}

function toDotted(value: number): string {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 0xff).join(".");
}

export function calculateCidr(input: string): CidrResult {
  const trimmed = input.trim();
  if (trimmed === "") return { ok: true };
  const match = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/.exec(trimmed);
  if (!match) return { ok: false, error: "Use CIDR notation, e.g. 192.168.1.0/24." };
  const ip = parseOctets(match[1]!);
  const prefix = Number(match[2]);
  if (ip === null) return { ok: false, error: "That is not a valid IPv4 address." };
  if (prefix > 32) return { ok: false, error: "Prefix length must be between 0 and 32." };

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (ip & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const total = 2 ** (32 - prefix);
  const usable = prefix >= 31 ? total : total - 2;

  const firstHost = prefix >= 31 ? network : (network + 1) >>> 0;
  const lastHost = prefix >= 31 ? broadcast : (broadcast - 1) >>> 0;

  return {
    ok: true,
    prefix,
    networkAddress: toDotted(network),
    broadcastAddress: toDotted(broadcast),
    netmask: toDotted(mask),
    wildcard: toDotted(~mask >>> 0),
    firstHost: toDotted(firstHost),
    lastHost: toDotted(lastHost),
    totalHosts: total,
    usableHosts: usable,
  };
}
