"use client";

import type * as MupdfModule from "mupdf";
import { imageEntryName } from "../../shared/extract.ts";

/**
 * MuPDF (PyMuPDF's engine) compiled to WebAssembly — structured extraction that
 * pdf-lib/pdfjs can't do (native embedded images, attachments) running entirely
 * in the browser. The glue locates `mupdf-wasm.wasm` via
 * `new URL("mupdf-wasm.wasm", import.meta.url)`, so webpack emits it as a
 * same-origin asset (no CDN). The module is imported lazily so the ~10 MB engine
 * only loads when a MuPDF-backed tool is actually opened.
 */
let mupdfMod: typeof MupdfModule | null = null;

async function ensureMupdf(): Promise<typeof MupdfModule> {
  if (!mupdfMod) mupdfMod = await import("mupdf");
  return mupdfMod;
}

export interface ExtractedImage {
  name: string;
  bytes: Uint8Array;
  width: number;
  height: number;
}

/**
 * Pull every embedded raster image out of a PDF at its native resolution by
 * decoding each image XObject to PNG. Returns them in document object order.
 */
export async function extractImages(pdfBytes: Uint8Array, baseName: string): Promise<ExtractedImage[]> {
  const mupdf = await ensureMupdf();
  const doc = mupdf.Document.openDocument(pdfBytes, "application/pdf");
  const pdf = doc.asPDF();
  if (!pdf) return [];
  const count = pdf.countObjects();
  const out: ExtractedImage[] = [];
  let ordinal = 0;
  for (let i = 1; i < count; i += 1) {
    let indirect;
    let resolved;
    try {
      indirect = pdf.newIndirect(i);
      resolved = indirect.resolve();
    } catch {
      continue;
    }
    let subtype = "";
    try {
      const s = resolved.get("Subtype");
      subtype = s && !s.isNull() ? s.asName() : "";
    } catch {
      subtype = "";
    }
    if (subtype !== "Image") continue;
    try {
      const image = pdf.loadImage(indirect);
      const pix = image.toPixmap();
      const png = pix.asPNG();
      ordinal += 1;
      out.push({
        name: imageEntryName(baseName, ordinal, "png"),
        bytes: png,
        width: pix.getWidth(),
        height: pix.getHeight(),
      });
      pix.destroy?.();
      image.destroy?.();
    } catch {
      // A malformed image object is skipped rather than failing the whole run.
    }
  }
  return out;
}

export interface OutlineEntry {
  title: string;
  /** Zero-based page index, or null if the bookmark has no page destination. */
  page: number | null;
}

interface RawOutline {
  title?: string;
  page?: number;
  uri?: string;
  down?: RawOutline[];
}

function outlinePage(item: RawOutline): number | null {
  if (typeof item.page === "number") return item.page;
  const m = item.uri ? /#page=(\d+)/.exec(item.uri) : null;
  return m ? Number(m[1]) - 1 : null;
}

/** Read the top-level bookmarks (outline) of a PDF with their page targets. */
export async function readOutline(pdfBytes: Uint8Array): Promise<OutlineEntry[]> {
  const mupdf = await ensureMupdf();
  const doc = mupdf.Document.openDocument(pdfBytes, "application/pdf");
  const raw = (doc.loadOutline() ?? []) as RawOutline[];
  return raw.map((item) => ({ title: (item.title ?? "").trim() || "Untitled", page: outlinePage(item) }));
}

export interface ExtractedAttachment {
  name: string;
  bytes: Uint8Array;
  mimetype: string;
}

/** List and pull out every file embedded (attached) in a PDF. */
export async function extractAttachments(pdfBytes: Uint8Array): Promise<ExtractedAttachment[]> {
  const mupdf = await ensureMupdf();
  const doc = mupdf.Document.openDocument(pdfBytes, "application/pdf");
  const pdf = doc.asPDF();
  if (!pdf) return [];
  const files = pdf.getEmbeddedFiles() as Record<string, unknown>;
  const out: ExtractedAttachment[] = [];
  for (const key of Object.keys(files ?? {})) {
    const spec = (files as Record<string, Parameters<typeof pdf.getFilespecParams>[0]>)[key]!;
    try {
      const params = pdf.getFilespecParams(spec);
      const buffer = pdf.getEmbeddedFileContents(spec);
      if (!buffer) continue;
      const bytes = buffer.asUint8Array();
      out.push({
        name: params?.filename || key,
        bytes: new Uint8Array(bytes),
        mimetype: params?.mimetype || "application/octet-stream",
      });
    } catch {
      // Skip a single unreadable attachment rather than aborting the whole set.
    }
  }
  return out;
}
