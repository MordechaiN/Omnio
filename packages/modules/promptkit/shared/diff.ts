/**
 * Line-level diff via LCS backtrace — the same technique as the general Text
 * Diff tool, kept local to promptkit so this module has no cross-module
 * dependency. Used to compare two prompt drafts.
 */
export type DiffOp = "equal" | "add" | "remove";

export interface DiffRow {
  op: DiffOp;
  text: string;
}

export function diffLines(oldText: string, newText: string): DiffRow[] {
  const a = oldText.split("\n");
  const b = newText.split("\n");
  const n = a.length;
  const m = b.length;

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
      rows.push({ op: "equal", text: a[i]! });
      i += 1;
      j += 1;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      rows.push({ op: "remove", text: a[i]! });
      i += 1;
    } else {
      rows.push({ op: "add", text: b[j]! });
      j += 1;
    }
  }
  while (i < n) {
    rows.push({ op: "remove", text: a[i]! });
    i += 1;
  }
  while (j < m) {
    rows.push({ op: "add", text: b[j]! });
    j += 1;
  }
  return rows;
}
