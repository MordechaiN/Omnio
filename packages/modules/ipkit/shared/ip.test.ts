import { describe, expect, it } from "vitest";
import { parseIp, parseIpv4, parseIpv6 } from "./ip.ts";

describe("parseIpv4", () => {
  it("parses a public address with all notations", () => {
    const info = parseIpv4("8.8.8.8")!;
    expect(info.kind).toBe("public");
    expect(info.integer).toBe(0x08080808);
    expect(info.hex).toBe("0x08080808");
    expect(info.binary).toBe("00001000.00001000.00001000.00001000");
  });

  it("handles the unsigned upper half correctly", () => {
    expect(parseIpv4("255.255.255.255")!.integer).toBe(4294967295);
    expect(parseIpv4("255.255.255.255")!.kind).toBe("broadcast");
    expect(parseIpv4("192.168.1.1")!.integer).toBe(3232235777);
  });

  it("classifies special ranges", () => {
    expect(parseIpv4("10.0.0.1")!.kind).toBe("private");
    expect(parseIpv4("172.16.0.1")!.kind).toBe("private");
    expect(parseIpv4("172.32.0.1")!.kind).toBe("public");
    expect(parseIpv4("192.168.0.1")!.kind).toBe("private");
    expect(parseIpv4("127.0.0.1")!.kind).toBe("loopback");
    expect(parseIpv4("169.254.10.20")!.kind).toBe("linkLocal");
    expect(parseIpv4("224.0.0.1")!.kind).toBe("multicast");
    expect(parseIpv4("100.64.0.1")!.kind).toBe("cgnat");
    expect(parseIpv4("192.0.2.55")!.kind).toBe("documentation");
    expect(parseIpv4("0.0.0.0")!.kind).toBe("unspecified");
  });

  it("rejects malformed addresses", () => {
    expect(parseIpv4("256.1.1.1")).toBeNull();
    expect(parseIpv4("1.2.3")).toBeNull();
    expect(parseIpv4("1.2.3.4.5")).toBeNull();
    expect(parseIpv4("01.2.3.4")).toBeNull();
    expect(parseIpv4("a.b.c.d")).toBeNull();
  });
});

describe("parseIpv6", () => {
  it("expands compressed notation", () => {
    const info = parseIpv6("2001:db8::1")!;
    expect(info.expanded).toBe("2001:0db8:0000:0000:0000:0000:0000:0001");
    expect(info.kind).toBe("documentation");
  });

  it("compresses per RFC 5952 (longest zero run, first on ties)", () => {
    expect(parseIpv6("2001:0db8:0000:0000:0001:0000:0000:0001")!.compressed).toBe(
      "2001:db8::1:0:0:1",
    );
    expect(parseIpv6("::1")!.compressed).toBe("::1");
    expect(parseIpv6("::")!.compressed).toBe("::");
  });

  it("does not compress a single zero group", () => {
    expect(parseIpv6("2001:db8:1:0:1:1:1:1")!.compressed).toBe("2001:db8:1:0:1:1:1:1");
  });

  it("classifies well-known kinds", () => {
    expect(parseIpv6("::1")!.kind).toBe("loopback");
    expect(parseIpv6("::")!.kind).toBe("unspecified");
    expect(parseIpv6("fe80::1")!.kind).toBe("linkLocal");
    expect(parseIpv6("fd12:3456::1")!.kind).toBe("uniqueLocal");
    expect(parseIpv6("ff02::1")!.kind).toBe("multicast");
    expect(parseIpv6("2606:4700::1111")!.kind).toBe("global");
  });

  it("rejects malformed addresses", () => {
    expect(parseIpv6("2001:db8")).toBeNull();
    expect(parseIpv6("1:2:3:4:5:6:7:8:9")).toBeNull();
    expect(parseIpv6("2001::db8::1")).toBeNull();
    expect(parseIpv6("gggg::1")).toBeNull();
    expect(parseIpv6("12345::1")).toBeNull();
  });
});

describe("parseIp", () => {
  it("dispatches by family", () => {
    expect(parseIp("1.1.1.1")!.version).toBe(4);
    expect(parseIp("::1")!.version).toBe(6);
    expect(parseIp("not an ip")).toBeNull();
  });
});
