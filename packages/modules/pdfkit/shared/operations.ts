/**
 * Pure page-order and layout math for the PDF tools — everything that can be
 * reasoned about without pdf-lib lives here so it's unit-testable. The
 * surfaces apply these index plans to a real document.
 */

/** Page indices in reverse (last page first). */
export function reversedOrder(pageCount: number): number[] {
  return Array.from({ length: pageCount }, (_, i) => pageCount - 1 - i);
}

/**
 * Page order with the selected pages duplicated in place — each chosen page
 * appears twice, back to back. `selected` is a set of zero-based indices.
 */
export function duplicatedOrder(pageCount: number, selected: ReadonlySet<number>): number[] {
  const order: number[] = [];
  for (let i = 0; i < pageCount; i += 1) {
    order.push(i);
    if (selected.has(i)) order.push(i);
  }
  return order;
}

export interface NUpCell {
  /** Column (0-based), left to right. */
  col: number;
  /** Row (0-based), top to bottom. */
  row: number;
}

export interface NUpLayout {
  cols: number;
  rows: number;
  /** Cell for each source page, in reading order. */
  cells: NUpCell[];
}

/** Grid placement for N pages per sheet (2 → 1×2, 4 → 2×2, 6 → 2×3, 9 → 3×3). */
export function nUpLayout(pageCount: number, perSheet: 2 | 4 | 6 | 9): NUpLayout {
  const grid: Record<number, { cols: number; rows: number }> = {
    2: { cols: 1, rows: 2 },
    4: { cols: 2, rows: 2 },
    6: { cols: 2, rows: 3 },
    9: { cols: 3, rows: 3 },
  };
  const { cols, rows } = grid[perSheet]!;
  const cells: NUpCell[] = [];
  for (let i = 0; i < pageCount; i += 1) {
    const withinSheet = i % perSheet;
    cells.push({ col: withinSheet % cols, row: Math.floor(withinSheet / cols) });
  }
  return { cols, rows, cells };
}

/** Clamp a crop margin (fraction 0–0.45 per side) so a page never collapses. */
export function clampMargin(fraction: number): number {
  return Math.min(0.45, Math.max(0, fraction));
}
