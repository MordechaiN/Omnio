import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { applySlots } from "./pdf-organize.ts";
import type { PageSlot } from "../../shared/organize.ts";

/**
 * Integration cover for the organizer's apply step: the slot maths is unit
 * tested in shared/organize.test.ts, but only a real document proves the copy,
 * rotation and blank-insertion actually land in the output.
 */

/** Build a PDF whose pages are distinguishable by size and rotation. */
async function makeSourcePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 4; i += 1) {
    // Each page is a different width so pages can be told apart after copying.
    const page = doc.addPage([300 + i * 10, 400]);
    page.drawText(`page ${i + 1}`, { x: 20, y: 20, size: 12, font });
  }
  return doc.save();
}

const slot = (source: number | null, rotation = 0): PageSlot => ({
  id: `s${source ?? "b"}_${rotation}`,
  source,
  rotation,
});

describe("applySlots", () => {
  it("reorders pages, identified by their distinct widths", async () => {
    const src = await makeSourcePdf();
    const out = await PDFDocument.load(await applySlots(src, [slot(3), slot(0)]));
    expect(out.getPageCount()).toBe(2);
    expect(Math.round(out.getPage(0).getWidth())).toBe(330); // old page 4
    expect(Math.round(out.getPage(1).getWidth())).toBe(300); // old page 1
  });

  it("drops pages that are not in the slot list", async () => {
    const src = await makeSourcePdf();
    const out = await PDFDocument.load(await applySlots(src, [slot(1)]));
    expect(out.getPageCount()).toBe(1);
    expect(Math.round(out.getPage(0).getWidth())).toBe(310);
  });

  it("duplicates a page into two independent copies", async () => {
    const src = await makeSourcePdf();
    const out = await PDFDocument.load(await applySlots(src, [slot(2), slot(2)]));
    expect(out.getPageCount()).toBe(2);
    expect(Math.round(out.getPage(0).getWidth())).toBe(320);
    expect(Math.round(out.getPage(1).getWidth())).toBe(320);
  });

  it("applies rotation on top of the page's existing angle", async () => {
    const src = await makeSourcePdf();
    const out = await PDFDocument.load(await applySlots(src, [slot(0, 90), slot(1, 270)]));
    expect(out.getPage(0).getRotation().angle).toBe(90);
    expect(out.getPage(1).getRotation().angle).toBe(270);
  });

  it("normalizes a rotation past a full turn", async () => {
    const src = await makeSourcePdf();
    const out = await PDFDocument.load(await applySlots(src, [slot(0, 450)]));
    expect(out.getPage(0).getRotation().angle).toBe(90);
  });

  it("inserts a blank page matching the document's page size", async () => {
    const src = await makeSourcePdf();
    const out = await PDFDocument.load(await applySlots(src, [slot(0), slot(null), slot(1)]));
    expect(out.getPageCount()).toBe(3);
    // Blank takes the first source page's dimensions, not an A4 default.
    expect(Math.round(out.getPage(1).getWidth())).toBe(300);
    expect(Math.round(out.getPage(1).getHeight())).toBe(400);
  });

  it("produces a document of only blanks when no source pages are kept", async () => {
    const src = await makeSourcePdf();
    const out = await PDFDocument.load(await applySlots(src, [slot(null), slot(null)]));
    expect(out.getPageCount()).toBe(2);
  });
});
