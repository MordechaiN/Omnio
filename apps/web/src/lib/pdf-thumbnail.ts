"use client";

import { workspace } from "@omnio/workspace";
import { registerPdfThumbnailer } from "@omnio/workspace/react";

/**
 * First-page thumbnails for PDFs.
 *
 * Registered with the workspace rather than built into it, so the storage layer
 * stays free of a rendering engine. pdf.js is imported lazily: a user who never
 * touches a PDF never downloads it.
 */

const THUMB_MAX = 320;

let installed = false;

/**
 * True when a rendered page has any non-white pixels worth speaking of.
 * Sampled on a coarse grid: this only has to distinguish "a page with content"
 * from "an empty sheet", not measure anything.
 */
function hasInk(context: CanvasRenderingContext2D, width: number, height: number): boolean {
  const step = Math.max(1, Math.floor(Math.min(width, height) / 60));
  const { data } = context.getImageData(0, 0, width, height);
  let marked = 0;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      if (data[i]! < 245 || data[i + 1]! < 245 || data[i + 2]! < 245) {
        marked += 1;
        if (marked > 8) return true;
      }
    }
  }
  return false;
}

export function installPdfThumbnailer(): void {
  if (installed) return;
  installed = true;

  registerPdfThumbnailer(async (file, fileId) => {
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      const bytes = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: bytes }).promise;
      const page = await doc.getPage(1);

      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(1.5, THUMB_MAX / Math.max(base.width, base.height));
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) return null;
      // A PDF page is transparent where it is blank; paint it white so the
      // thumbnail reads as paper rather than a hole in the grid.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: context, viewport }).promise;

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.82),
      );

      // The document is already open, so establishing whether it carries any
      // selectable text costs almost nothing here — and it is the difference
      // between "a PDF" and "a picture of a document". Only the first few pages
      // are checked; a scan is a scan from page one.
      if (fileId) {
        // A blank page also has no text. Calling it a scan would be a wrong
        // claim, so the page must actually carry ink before "no text" means
        // anything — sampled from the thumbnail already rendered above.
        const inked = hasInk(context, canvas.width, canvas.height);
        let hasText = false;
        const probePages = Math.min(doc.numPages, 3);
        for (let i = 1; i <= probePages && !hasText; i += 1) {
          const content = await (await doc.getPage(i)).getTextContent();
          hasText = content.items.some(
            (item) => "str" in item && typeof item.str === "string" && item.str.trim() !== "",
          );
        }
        // Reporting hasText: true for a blank page keeps the scan insight silent,
        // which is the honest outcome — there is nothing to make searchable.
        void workspace.setFacts(fileId, {
          kind: "pdf",
          pages: doc.numPages,
          hasText: hasText || !inked,
        });
      }

      void doc.destroy();
      return blob ? { blob, width: canvas.width, height: canvas.height } : null;
    } catch {
      // A PDF we cannot render simply keeps its generic icon.
      return null;
    }
  });
}
