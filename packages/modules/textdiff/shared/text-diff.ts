/**
 * Line-level diff via a longest-common-subsequence backtrace — on-device.
 * Returns a flat list of rows (equal / added / removed) suitable for a
 * side-by-side or unified view.
 */

export type DiffOp = "equal" | "add" | "remove";

export interface DiffRow {
  op: DiffOp;
  text: string;
  /** 1-based line numbers in the old/new documents, null when absent. */
  oldLine: number | null;
  newLine: number | null;
}

export interface DiffSummary {
  added: number;
  removed: number;
}

export function diffLines(oldText: string, newText: string): DiffRow[] {
  const a = oldText.split("\n");
  const b = newText.split("\n");
  const n = a.length;
  const m = b.length;

  // LCS length table.
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }

  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({ op: "equal", text: a[i]!, oldLine: i + 1, newLine: j + 1 });
      i += 1;
      j += 1;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      rows.push({ op: "remove", text: a[i]!, oldLine: i + 1, newLine: null });
      i += 1;
    } else {
      rows.push({ op: "add", text: b[j]!, oldLine: null, newLine: j + 1 });
      j += 1;
    }
  }
  while (i < n) {
    rows.push({ op: "remove", text: a[i]!, oldLine: i + 1, newLine: null });
    i += 1;
  }
  while (j < m) {
    rows.push({ op: "add", text: b[j]!, oldLine: null, newLine: j + 1 });
    j += 1;
  }
  return rows;
}

export function summarize(rows: DiffRow[]): DiffSummary {
  return rows.reduce<DiffSummary>(
    (acc, row) => {
      if (row.op === "add") acc.added += 1;
      if (row.op === "remove") acc.removed += 1;
      return acc;
    },
    { added: 0, removed: 0 },
  );
}
