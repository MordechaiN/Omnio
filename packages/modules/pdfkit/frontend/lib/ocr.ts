"use client";

import { PDFDocument, StandardFonts } from "pdf-lib";
import { createWorker, type Worker } from "tesseract.js";
import { loadPdfjsDocument, renderPageToCanvas } from "./pdfjs.ts";
import { mapWordToPdf, type WordBox } from "../../shared/ocr-layout.ts";

/**
 * OCR a PDF and return a copy with an invisible, searchable text layer over each
 * page. Everything runs same-origin in the browser: pdf.js rasterizes each page,
 * tesseract.js (worker + core + English data served from /tesseract/, no CDN)
 * recognizes it, and pdf-lib draws the recognized words as transparent text —
 * present and selectable for search, but not visible over the original scan.
 */

// pdf.js is rendered at 2x so tesseract sees a crisp image; word boxes are then
// divided back down by this scale when placed onto the PDF.
const RENDER_SCALE = 2;

interface OcrWord {
  text: string;
  bbox: WordBox;
  confidence: number;
}

async function makeWorker(onProgress: (fraction: number) => void): Promise<Worker> {
  return createWorker("eng", 1, {
    workerPath: "/tesseract/worker.min.js",
    corePath: "/tesseract/",
    langPath: "/tesseract/",
    gzip: true,
    logger: (m) => {
      if (m.status === "recognizing text") onProgress(m.progress);
    },
  });
}

function collectWords(data: { blocks?: unknown[] }): OcrWord[] {
  const words: OcrWord[] = [];
  const blocks = (data.blocks ?? []) as Array<{ paragraphs?: Array<{ lines?: Array<{ words?: Array<{ text: string; bbox: WordBox; confidence: number }> }> }> }>;
  for (const block of blocks) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        for (const w of line.words ?? []) {
          if (w.text.trim() !== "") words.push({ text: w.text, bbox: w.bbox, confidence: w.confidence });
        }
      }
    }
  }
  return words;
}

/** Helvetica (WinAnsi) can't encode every glyph; drop anything it would reject. */
function winAnsiSafe(text: string): string {
  return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, "").trim();
}

export interface OcrResult {
  pdf: Uint8Array;
  /** Mean per-word confidence across the document, 0–100. */
  confidence: number;
  wordCount: number;
}

export async function ocrToSearchablePdf(
  pdfBytes: Uint8Array,
  onProgress: (pageIndex: number, pageCount: number, pageFraction: number) => void,
): Promise<OcrResult> {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pageCount = doc.getPageCount();

  const renderDoc = await loadPdfjsDocument(pdfBytes.slice().buffer);
  const worker = await makeWorker(() => {});

  let confidenceSum = 0;
  let confidenceCount = 0;
  let totalWords = 0;

  try {
    for (let i = 0; i < pageCount; i += 1) {
      const canvas = await renderPageToCanvas(renderDoc, i + 1, RENDER_SCALE);
      const { data } = await worker.recognize(canvas, {}, { blocks: true });
      const words = collectWords(data as { blocks?: unknown[] });
      const page = doc.getPage(i);
      const pageHeight = page.getHeight();

      for (const w of words) {
        const safe = winAnsiSafe(w.text);
        if (safe === "") continue;
        const place = mapWordToPdf(w.bbox, pageHeight, RENDER_SCALE);
        page.drawText(safe, {
          x: place.xPt,
          y: place.yPt,
          size: place.fontSizePt,
          font,
          opacity: 0,
        });
        confidenceSum += w.confidence;
        confidenceCount += 1;
        totalWords += 1;
      }
      onProgress(i + 1, pageCount, 1);
    }
  } finally {
    await worker.terminate();
  }

  const out = await doc.save();
  return {
    pdf: out,
    confidence: confidenceCount > 0 ? Math.round(confidenceSum / confidenceCount) : 0,
    wordCount: totalWords,
  };
}
