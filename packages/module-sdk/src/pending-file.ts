/**
 * The file hand-off between the universal drop zone and a tool surface.
 * The shell stores the dropped file(s) here right before navigating to the
 * chosen tool; the tool's loader takes them exactly once on mount and opens
 * them as if the user had picked them locally. In-memory only — nothing is
 * persisted, and an unclaimed hand-off simply evaporates on the next one.
 */

let pending: File[] | null = null;

export function setPendingFiles(files: File[]): void {
  pending = files.length > 0 ? files : null;
}

/** Claim the handed-off files (one-shot). Null when there is nothing waiting. */
export function takePendingFiles(): File[] | null {
  const files = pending;
  pending = null;
  return files;
}
