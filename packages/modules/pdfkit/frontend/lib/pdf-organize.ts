"use client";

import { PDFDocument, degrees } from "pdf-lib";
import { normalizeRotation, type PageSlot } from "../../shared/organize.ts";

/**
 * Turn the organizer's slot list into a real PDF.
 *
 * Pages are copied in slot order, so reordering, duplication and deletion all
 * fall out of the list itself. Extra rotation is added to whatever the page
 * already carried rather than replacing it, so rotating a page that was already
 * sideways in the source behaves the way the thumbnail showed it.
 */
export async function applySlots(sourceBytes: Uint8Array, slots: PageSlot[]): Promise<Uint8Array> {
  const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  const out = await PDFDocument.create();

  // copyPages is far cheaper in one batch than per page; duplicated slots point
  // at the same source index and each get their own copy.
  const sourceIndices = slots.flatMap((s) => (s.source === null ? [] : [s.source]));
  const copied = sourceIndices.length > 0 ? await out.copyPages(source, sourceIndices) : [];

  // A blank page should match the document, not an arbitrary A4 default.
  const first = source.getPageCount() > 0 ? source.getPage(0) : null;
  const blankSize: [number, number] = first ? [first.getWidth(), first.getHeight()] : [595.28, 841.89];

  let copiedIndex = 0;
  for (const slot of slots) {
    if (slot.source === null) {
      out.addPage(blankSize);
      continue;
    }
    const page = copied[copiedIndex]!;
    copiedIndex += 1;
    if (slot.rotation !== 0) {
      page.setRotation(degrees(normalizeRotation(page.getRotation().angle + slot.rotation)));
    }
    out.addPage(page);
  }

  return out.save();
}
