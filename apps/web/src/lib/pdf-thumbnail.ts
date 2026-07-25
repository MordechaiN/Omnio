"use client";

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

export function installPdfThumbnailer(): void {
  if (installed) return;
  installed = true;

  registerPdfThumbnailer(async (file) => {
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
      void doc.destroy();
      return blob ? { blob, width: canvas.width, height: canvas.height } : null;
    } catch {
      // A PDF we cannot render simply keeps its generic icon.
      return null;
    }
  });
}
