import { describe, expect, it } from "vitest";
import { linearizeArgs, repairArgs, sanitizeArgs } from "./qpdf-args.ts";

describe("qpdf arg builders", () => {
  it("linearize enables fast-web-view optimization", () => {
    expect(linearizeArgs("/in.pdf", "/out.pdf")).toEqual(["--linearize", "/in.pdf", "/out.pdf"]);
  });

  it("repair rewrites a clean, normalized copy with input/output last", () => {
    const a = repairArgs("/in.pdf", "/out.pdf");
    expect(a).toContain("--recompress-flate");
    expect(a).toContain("--object-streams=generate");
    expect(a[a.length - 2]).toBe("/in.pdf");
    expect(a[a.length - 1]).toBe("/out.pdf");
  });

  it("sanitize drops unreferenced resources and rebuilds", () => {
    const a = sanitizeArgs("/in.pdf", "/out.pdf");
    expect(a).toContain("--remove-unreferenced-resources=yes");
    expect(a[a.length - 2]).toBe("/in.pdf");
    expect(a[a.length - 1]).toBe("/out.pdf");
  });
});
