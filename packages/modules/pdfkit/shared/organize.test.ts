import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteSelected,
  duplicateSelected,
  initialSlots,
  insertBlankAt,
  isUnchanged,
  movePages,
  normalizeRotation,
  rangeIds,
  resetSlotIds,
  rotateSelected,
  type PageSlot,
} from "./organize.ts";

beforeEach(() => resetSlotIds());

const ids = (slots: PageSlot[]) => slots.map((s) => s.id);
const sources = (slots: PageSlot[]) => slots.map((s) => s.source);
const sel = (...s: string[]) => new Set(s);

describe("initialSlots / isUnchanged", () => {
  it("maps one slot per source page", () => {
    expect(sources(initialSlots(3))).toEqual([0, 1, 2]);
  });

  it("reports an untouched list as unchanged", () => {
    expect(isUnchanged(initialSlots(3), 3)).toBe(true);
  });

  it("notices a rotation", () => {
    const slots = rotateSelected(initialSlots(3), sel("s1"), 90);
    expect(isUnchanged(slots, 3)).toBe(false);
  });

  it("notices a reorder", () => {
    const slots = movePages(initialSlots(3), sel("s3"), 0);
    expect(isUnchanged(slots, 3)).toBe(false);
  });
});

describe("normalizeRotation", () => {
  it("wraps past a full turn", () => {
    expect(normalizeRotation(450)).toBe(90);
  });

  it("handles counter-clockwise", () => {
    expect(normalizeRotation(-90)).toBe(270);
  });
});

describe("movePages", () => {
  it("moves a single page to the front", () => {
    expect(sources(movePages(initialSlots(3), sel("s3"), 0))).toEqual([2, 0, 1]);
  });

  it("moves a multi-selection together, preserving their relative order", () => {
    // pages 1 and 3 dropped at the end
    expect(sources(movePages(initialSlots(4), sel("s1", "s3"), 4))).toEqual([1, 3, 0, 2]);
  });

  it("accounts for selected pages lifted from before the drop point", () => {
    // Moving page 0 to index 2 should land it between the old pages 1 and 2.
    expect(sources(movePages(initialSlots(4), sel("s1"), 2))).toEqual([1, 0, 2, 3]);
  });

  it("is a no-op with an empty selection", () => {
    const slots = initialSlots(3);
    expect(movePages(slots, sel(), 1)).toBe(slots);
  });
});

describe("rotateSelected", () => {
  it("rotates only the selection and accumulates", () => {
    let slots = rotateSelected(initialSlots(3), sel("s2"), 90);
    slots = rotateSelected(slots, sel("s2"), 90);
    expect(slots.map((s) => s.rotation)).toEqual([0, 180, 0]);
  });
});

describe("deleteSelected", () => {
  it("removes the selection", () => {
    expect(sources(deleteSelected(initialSlots(3), sel("s2")))).toEqual([0, 2]);
  });
});

describe("duplicateSelected", () => {
  it("copies each selected page directly after itself with a fresh id", () => {
    const out = duplicateSelected(initialSlots(2), sel("s1"));
    expect(sources(out)).toEqual([0, 0, 1]);
    expect(new Set(ids(out)).size).toBe(3);
  });
});

describe("insertBlankAt", () => {
  it("inserts a blank slot with no source", () => {
    expect(sources(insertBlankAt(initialSlots(2), 1))).toEqual([0, null, 1]);
  });

  it("clamps an out-of-range index to the end", () => {
    expect(sources(insertBlankAt(initialSlots(2), 99))).toEqual([0, 1, null]);
  });
});

describe("rangeIds", () => {
  it("selects inclusively between two slots", () => {
    expect(rangeIds(initialSlots(4), "s2", "s4")).toEqual(["s2", "s3", "s4"]);
  });

  it("is order-independent", () => {
    expect(rangeIds(initialSlots(4), "s4", "s2")).toEqual(["s2", "s3", "s4"]);
  });
});
