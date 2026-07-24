/**
 * Signature model for the unified PDF editor — pure geometry and decoding, kept
 * out of the React/engine code so it's unit-testable.
 *
 * Honesty note (deliberate, load-bearing): a `visual` signature is an image
 * stamped onto the page. It is *not* a cryptographic signature and carries no
 * tamper-evidence — the UI must say so. The `mode` discriminant exists so a
 * certificate-based (PAdES) signer can be added later as a second mode without
 * reshaping the annotation model or the editor's placement code.
 */

/** How a signature asserts identity. Only `visual` is implemented today. */
export type SignatureMode = "visual" | "certificate";

/** How the user produced the visual mark. */
export type SignatureSource = "draw" | "type" | "image";

export interface VisualSignature {
  mode: "visual";
  source: SignatureSource;
  /** PNG data URL of the mark, transparent background. */
  png: string;
  /** Natural pixel size of the PNG, used to preserve aspect ratio on placement. */
  naturalWidth: number;
  naturalHeight: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Fit a signature's natural size inside a placement box without distorting it,
 * centred on the box. Signatures are the one annotation where a stretched
 * aspect ratio is immediately obvious and looks forged, so placement always
 * letterboxes rather than filling.
 */
export function fitSignatureRect(natural: Size, box: Rect): Rect {
  const boxW = Math.abs(box.x1 - box.x0);
  const boxH = Math.abs(box.y1 - box.y0);
  const x0 = Math.min(box.x0, box.x1);
  const y0 = Math.min(box.y0, box.y1);
  if (natural.width <= 0 || natural.height <= 0 || boxW <= 0 || boxH <= 0) {
    return { x0, y0, x1: x0 + boxW, y1: y0 + boxH };
  }
  const scale = Math.min(boxW / natural.width, boxH / natural.height);
  const w = natural.width * scale;
  const h = natural.height * scale;
  const offsetX = (boxW - w) / 2;
  const offsetY = (boxH - h) / 2;
  return { x0: x0 + offsetX, y0: y0 + offsetY, x1: x0 + offsetX + w, y1: y0 + offsetY + h };
}

/**
 * Decode a PNG data URL into bytes for pdf-lib's `embedPng`.
 *
 * Rejects anything that is not `image/png`: the editor draws signatures to a
 * canvas and exports PNG, so a different type means the input did not come from
 * that path and should not be trusted into the document.
 */
export function dataUrlToPngBytes(dataUrl: string): Uint8Array {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!match) throw new Error("Signature must be a base64 image/png data URL.");
  const binary = atob(match[1]!);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
