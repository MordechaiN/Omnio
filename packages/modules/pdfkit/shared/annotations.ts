/**
 * Annotation model for the unified PDF editor — pure geometry and types, kept
 * out of the React/engine code so it's unit-testable. Annotations are stored in
 * PDF coordinates (points, bottom-left origin) so baking is independent of the
 * on-screen render scale.
 */

export type AnnotationKind =
  | "highlight"
  | "underline"
  | "rect"
  | "ellipse"
  | "line"
  | "ink"
  | "note"
  | "redact";

export interface Point {
  x: number;
  y: number;
}

export interface Annotation {
  id: string;
  kind: AnnotationKind;
  page: number;
  color: string;
  /** For box-like kinds: two opposite corners in PDF points. */
  rect?: { x0: number; y0: number; x1: number; y1: number };
  /** For ink/line: a path of PDF-point vertices. */
  path?: Point[];
  /** For note: the text content. */
  text?: string;
}

/**
 * Map a pointer position relative to a rendered page (CSS px from the page's
 * top-left, at `scale` px per PDF point) into PDF points with a bottom-left
 * origin — the coordinate space pdf-lib and mupdf draw in.
 */
export function screenToPdf(sx: number, sy: number, pageHeightPt: number, scale: number): Point {
  return { x: sx / scale, y: pageHeightPt - sy / scale };
}

/** Normalize two corners into an axis-aligned rect (x0<x1, y0<y1) in PDF points. */
export function normalizeRect(a: Point, b: Point): { x0: number; y0: number; x1: number; y1: number } {
  return {
    x0: Math.min(a.x, b.x),
    y0: Math.min(a.y, b.y),
    x1: Math.max(a.x, b.x),
    y1: Math.max(a.y, b.y),
  };
}
