"use client";

/**
 * Remembers which workspace file was handed to which tool, so the file that
 * tool produces can be linked back to its input.
 *
 * Without this the provenance graph only ever recorded imports, and Omnio could
 * never learn a sequence from ordinary use — which is the whole basis of chains.
 * A handoff is consumed once and then cleared: a stale one would attribute an
 * unrelated output to the wrong parent, and a wrong lineage is worse than none.
 */

const KEY = "omnio.handoff";

export interface Handoff {
  fileId: string;
  toolId: string;
  at: number;
  /**
   * Set when this handoff is rebuilding something that already exists.
   *
   * Carried here rather than in a second mechanism because it is the same idea
   * with one more fact attached: an intent, remembered across exactly one
   * navigation, consumed once. When the tool produces its file, the result takes
   * this name and the file it replaces is archived — which is the difference
   * between Omnio telling you an export is stale and Omnio dealing with it.
   */
  replaces?: { fileId: string; name: string };
}

/** Handoffs older than this are ignored — the user has moved on. */
const MAX_AGE_MS = 30 * 60 * 1000;

export function rememberHandoff(
  fileId: string,
  toolId: string,
  replaces?: { fileId: string; name: string },
): void {
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ fileId, toolId, at: Date.now(), replaces } satisfies Handoff),
    );
  } catch {
    // Without storage, outputs simply arrive unlinked.
  }
}

/** Read and clear the pending handoff, if it is still fresh. */
export function takeHandoff(): Handoff | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const handoff = JSON.parse(raw) as Handoff;
    return Date.now() - handoff.at <= MAX_AGE_MS ? handoff : null;
  } catch {
    return null;
  }
}

export function clearHandoff(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
