"use client";

import type { PDFDocumentProxy, getDocument as GetDocument } from "pdfjs-dist";

/**
 * Lazy pdf.js loader with the worker wired for the Next/webpack build.
 * `new URL(..., import.meta.url)` makes webpack emit the worker as an asset and
 * hand back a same-origin URL, so rendering stays entirely in the browser with
 * no external CDN. The import is deferred so pdf.js (large) only loads when a
 * rendering tool is actually opened.
 */
let docLoader: typeof GetDocument | null = null;

async function ensurePdfjs(): Promise<typeof GetDocument> {
  if (docLoader) return docLoader;
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  docLoader = pdfjs.getDocument;
  return docLoader;
}

export async function loadPdfjsDocument(bytes: ArrayBuffer): Promise<PDFDocumentProxy> {
  const getDocument = await ensurePdfjs();
  // Copy into a fresh buffer: pdf.js transfers ownership to the worker, which
  // would detach a buffer the caller still needs.
  return getDocument({ data: bytes.slice(0) }).promise;
}

/** Render one page to a canvas at the given scale; returns the canvas. */
export async function renderPageToCanvas(
  doc: PDFDocumentProxy,
  pageNumber: number,
  scale: number,
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no 2d context");
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
}
