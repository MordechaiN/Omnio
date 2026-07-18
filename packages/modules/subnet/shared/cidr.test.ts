import { describe, expect, it } from "vitest";
import { calculateCidr } from "./cidr.ts";

describe("calculateCidr", () => {
  it("computes a /24", () => {
    const r = calculateCidr("192.168.1.10/24");
    expect(r.networkAddress).toBe("192.168.1.0");
    expect(r.broadcastAddress).toBe("192.168.1.255");
    expect(r.netmask).toBe("255.255.255.0");
    expect(r.wildcard).toBe("0.0.0.255");
    expect(r.firstHost).toBe("192.168.1.1");
    expect(r.lastHost).toBe("192.168.1.254");
    expect(r.totalHosts).toBe(256);
    expect(r.usableHosts).toBe(254);
  });

  it("handles a /31 point-to-point link", () => {
    const r = calculateCidr("10.0.0.0/31");
    expect(r.usableHosts).toBe(2);
    expect(r.firstHost).toBe("10.0.0.0");
    expect(r.lastHost).toBe("10.0.0.1");
  });

  it("handles a /32 host route", () => {
    const r = calculateCidr("8.8.8.8/32");
    expect(r.networkAddress).toBe("8.8.8.8");
    expect(r.totalHosts).toBe(1);
  });

  it("computes a large /16", () => {
    const r = calculateCidr("172.16.5.4/16");
    expect(r.networkAddress).toBe("172.16.0.0");
    expect(r.usableHosts).toBe(65534);
  });

  it("rejects bad input", () => {
    expect(calculateCidr("192.168.1.0").ok).toBe(false);
    expect(calculateCidr("999.1.1.1/24").ok).toBe(false);
    expect(calculateCidr("10.0.0.0/40").ok).toBe(false);
  });
});
