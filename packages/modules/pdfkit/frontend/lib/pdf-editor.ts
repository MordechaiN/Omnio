"use client";

import { PDFDocument, StandardFonts, rgb, type RGB } from "pdf-lib";
import type * as MupdfModule from "mupdf";
import type { Annotation } from "../../shared/annotations.ts";

/**
 * Bake editor annotations into a PDF. Redactions run first through MuPDF, which
 * genuinely removes the covered content (not just paints over it); every other
 * annotation is then drawn with pdf-lib. All in-browser, same-origin.
 */

let mupdfMod: typeof MupdfModule | null = null;
async function ensureMupdf(): Promise<typeof MupdfModule> {
  if (!mupdfMod) mupdfMod = await import("mupdf");
  return mupdfMod;
}

function hexToRgb(hex: string): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return rgb(0, 0, 0);
  const n = parseInt(m[1]!, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function winAnsiSafe(text: string): string {
  return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}

/** Apply redaction annotations via MuPDF (true content removal). */
async function applyRedactions(pdfBytes: Uint8Array, redactions: Annotation[]): Promise<Uint8Array> {
  if (redactions.length === 0) return pdfBytes;
  const mupdf = await ensureMupdf();
  const doc = mupdf.Document.openDocument(pdfBytes, "application/pdf");
  const pdf = doc.asPDF();
  if (!pdf) return pdfBytes;
  const byPage = new Map<number, Annotation[]>();
  for (const r of redactions) {
    if (!r.rect) continue;
    const list = byPage.get(r.page) ?? [];
    list.push(r);
    byPage.set(r.page, list);
  }
  for (const [pageIndex, items] of byPage) {
    const page = pdf.loadPage(pageIndex) as MupdfModule.PDFPage;
    const bounds = page.getBounds();
    const pageHeight = bounds[3] - bounds[1];
    for (const r of items) {
      const annot = page.createAnnotation("Redact");
      // Convert PDF points (bottom-left origin) to MuPDF's top-left space.
      annot.setRect([r.rect!.x0, pageHeight - r.rect!.y1, r.rect!.x1, pageHeight - r.rect!.y0]);
    }
    page.applyRedactions();
  }
  const buffer = pdf.saveToBuffer("garbage=compact");
  return buffer.asUint8Array();
}

export async function bakeAnnotations(pdfBytes: Uint8Array, annotations: Annotation[]): Promise<Uint8Array> {
  const redactions = annotations.filter((a) => a.kind === "redact");
  const drawn = annotations.filter((a) => a.kind !== "redact");

  const redacted = await applyRedactions(pdfBytes, redactions);

  const doc = await PDFDocument.load(redacted, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();

  for (const a of drawn) {
    const page = pages[a.page];
    if (!page) continue;
    const color = hexToRgb(a.color);
    switch (a.kind) {
      case "highlight":
        if (a.rect) {
          page.drawRectangle({
            x: a.rect.x0,
            y: a.rect.y0,
            width: a.rect.x1 - a.rect.x0,
            height: a.rect.y1 - a.rect.y0,
            color,
            opacity: 0.35,
          });
        }
        break;
      case "underline":
        if (a.rect) {
          page.drawLine({ start: { x: a.rect.x0, y: a.rect.y0 }, end: { x: a.rect.x1, y: a.rect.y0 }, thickness: 2, color });
        }
        break;
      case "rect":
        if (a.rect) {
          page.drawRectangle({
            x: a.rect.x0,
            y: a.rect.y0,
            width: a.rect.x1 - a.rect.x0,
            height: a.rect.y1 - a.rect.y0,
            borderColor: color,
            borderWidth: 2,
          });
        }
        break;
      case "ellipse":
        if (a.rect) {
          page.drawEllipse({
            x: (a.rect.x0 + a.rect.x1) / 2,
            y: (a.rect.y0 + a.rect.y1) / 2,
            xScale: Math.abs(a.rect.x1 - a.rect.x0) / 2,
            yScale: Math.abs(a.rect.y1 - a.rect.y0) / 2,
            borderColor: color,
            borderWidth: 2,
          });
        }
        break;
      case "line":
        if (a.path && a.path.length >= 2) {
          page.drawLine({ start: a.path[0]!, end: a.path[a.path.length - 1]!, thickness: 2, color });
        }
        break;
      case "ink":
        if (a.path && a.path.length >= 2) {
          for (let i = 1; i < a.path.length; i += 1) {
            page.drawLine({ start: a.path[i - 1]!, end: a.path[i]!, thickness: 2, color });
          }
        }
        break;
      case "note":
        if (a.rect) {
          const text = winAnsiSafe(a.text ?? "");
          page.drawRectangle({
            x: a.rect.x0,
            y: a.rect.y0,
            width: Math.max(24, a.rect.x1 - a.rect.x0),
            height: Math.max(16, a.rect.y1 - a.rect.y0),
            color,
            opacity: 0.2,
            borderColor: color,
            borderWidth: 1,
          });
          if (text) {
            page.drawText(text, { x: a.rect.x0 + 3, y: a.rect.y1 - 12, size: 9, font, color: rgb(0.1, 0.1, 0.1), maxWidth: Math.max(40, a.rect.x1 - a.rect.x0 - 6), lineHeight: 11 });
          }
        }
        break;
      default:
        break;
    }
  }

  return doc.save();
}
