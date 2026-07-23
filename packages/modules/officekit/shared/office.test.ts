import { describe, expect, it } from "vitest";
import { pdfName, sofficeArgs } from "./office.ts";

describe("pdfName", () => {
  it("swaps the extension for .pdf", () => {
    expect(pdfName("Report Q3.docx")).toBe("Report Q3.pdf");
    expect(pdfName("budget.xlsx")).toBe("budget.pdf");
  });
  it("falls back when there is no usable name", () => {
    expect(pdfName("")).toBe("document.pdf");
  });
});

describe("sofficeArgs", () => {
  it("builds a headless convert-to-pdf invocation with a per-job profile", () => {
    const args = sofficeArgs("/scratch", "/scratch/report.docx");
    expect(args).toContain("--headless");
    expect(args).toContain("--convert-to");
    expect(args[args.indexOf("--convert-to") + 1]).toBe("pdf");
    expect(args).toContain("--outdir");
    expect(args[args.indexOf("--outdir") + 1]).toBe("/scratch");
    expect(args.some((a) => a.startsWith("-env:UserInstallation=file:///scratch/lo-profile"))).toBe(true);
    expect(args[args.length - 1]).toBe("/scratch/report.docx");
  });
});
