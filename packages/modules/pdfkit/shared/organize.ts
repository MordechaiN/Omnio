/**
 * Working model for the visual page organizer.
 *
 * The grid edits a list of *slots*, not the PDF itself: each slot either points
 * at a source page or is a blank to insert, and carries any extra rotation the
 * user applied. Nothing touches pdf-lib until the user applies, so every
 * operation is cheap, reorderable and undoable — and a slot list is trivially
 * comparable in a test, which a PDF is not.
 */

export interface PageSlot {
  id: string;
  /** Zero-based index in the source document, or null for an inserted blank page. */
  source: number | null;
  /** Extra rotation in degrees, added to the page's own. Always 0/90/180/270. */
  rotation: number;
}

let slotCounter = 0;
export const newSlotId = (): string => `s${(slotCounter += 1)}`;

/** Reset the id counter — tests only, so ids are predictable. */
export function resetSlotIds(): void {
  slotCounter = 0;
}

export function initialSlots(pageCount: number): PageSlot[] {
  return Array.from({ length: pageCount }, (_, i) => ({ id: newSlotId(), source: i, rotation: 0 }));
}

/** Fold any rotation into the 0/90/180/270 range, including negatives. */
export function normalizeRotation(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/**
 * Move every selected slot to sit before `targetIndex`, preserving both their
 * relative order and the caller's intent when the target lies inside the
 * selection. Multi-select drag is the whole point of a grid organizer, so this
 * is deliberately not a single-item swap.
 */
export function movePages(slots: PageSlot[], selectedIds: Set<string>, targetIndex: number): PageSlot[] {
  const moving = slots.filter((s) => selectedIds.has(s.id));
  if (moving.length === 0) return slots;
  // How many selected slots sit before the drop point — the target shifts left
  // by that many once they are lifted out.
  const removedBefore = slots.slice(0, targetIndex).filter((s) => selectedIds.has(s.id)).length;
  const rest = slots.filter((s) => !selectedIds.has(s.id));
  const insertAt = Math.max(0, Math.min(rest.length, targetIndex - removedBefore));
  return [...rest.slice(0, insertAt), ...moving, ...rest.slice(insertAt)];
}

export function rotateSelected(slots: PageSlot[], selectedIds: Set<string>, delta: number): PageSlot[] {
  if (selectedIds.size === 0) return slots;
  return slots.map((s) =>
    selectedIds.has(s.id) ? { ...s, rotation: normalizeRotation(s.rotation + delta) } : s,
  );
}

export function deleteSelected(slots: PageSlot[], selectedIds: Set<string>): PageSlot[] {
  if (selectedIds.size === 0) return slots;
  return slots.filter((s) => !selectedIds.has(s.id));
}

/** Duplicate each selected slot immediately after itself. */
export function duplicateSelected(slots: PageSlot[], selectedIds: Set<string>): PageSlot[] {
  if (selectedIds.size === 0) return slots;
  const out: PageSlot[] = [];
  for (const slot of slots) {
    out.push(slot);
    if (selectedIds.has(slot.id)) out.push({ ...slot, id: newSlotId() });
  }
  return out;
}

export function insertBlankAt(slots: PageSlot[], index: number): PageSlot[] {
  const at = Math.max(0, Math.min(slots.length, index));
  const blank: PageSlot = { id: newSlotId(), source: null, rotation: 0 };
  return [...slots.slice(0, at), blank, ...slots.slice(at)];
}

/**
 * Range select between two slots, for shift-click. Inclusive of both ends and
 * order-independent, so shift-clicking upward behaves like shift-clicking down.
 */
export function rangeIds(slots: PageSlot[], fromId: string, toId: string): string[] {
  const a = slots.findIndex((s) => s.id === fromId);
  const b = slots.findIndex((s) => s.id === toId);
  if (a < 0 || b < 0) return [];
  return slots.slice(Math.min(a, b), Math.max(a, b) + 1).map((s) => s.id);
}

/** True when the slot list still matches the untouched source document. */
export function isUnchanged(slots: PageSlot[], pageCount: number): boolean {
  return (
    slots.length === pageCount &&
    slots.every((s, i) => s.source === i && s.rotation === 0)
  );
}
