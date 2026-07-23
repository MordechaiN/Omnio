/**
 * Coordinate math for the OCR searchable-text layer — pure and unit-testable.
 * Tesseract reports word boxes in image pixels with a top-left origin; pdf-lib
 * draws text in PDF points with a bottom-left origin and a text baseline. This
 * maps one word box, rendered at `scale`, onto the page.
 */
export interface WordBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface PdfWordPlacement {
  /** Left edge, PDF points. */
  xPt: number;
  /** Text baseline, PDF points (bottom-left origin). */
  yPt: number;
  /** Font size to fill the box height, PDF points. */
  fontSizePt: number;
  /** Box width, PDF points — used to horizontally scale the glyphs to fit. */
  widthPt: number;
}

export function mapWordToPdf(box: WordBox, pageHeightPt: number, scale: number): PdfWordPlacement {
  const xPt = box.x0 / scale;
  const widthPt = Math.max(0, (box.x1 - box.x0) / scale);
  const fontSizePt = Math.max(1, (box.y1 - box.y0) / scale);
  // Baseline at the bottom edge of the box, flipped into bottom-left space.
  const yPt = pageHeightPt - box.y1 / scale;
  return { xPt, yPt, fontSizePt, widthPt };
}
