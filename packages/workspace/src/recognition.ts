/**
 * Recognising a file Omnio has handled before.
 *
 * This is the one thing a converter website structurally cannot do. A website
 * receives bytes, returns bytes, and forgets. Omnio stores content by its hash
 * and records what every result was made from — so when the same bytes arrive a
 * second time, it already knows what happened last time and whether the finished
 * work still exists.
 *
 * The payoff is not a clever label. It is not doing the job twice: the OCR you
 * ran on this scan last Tuesday is still sitting there, and re-running it would
 * produce the same file after the same wait.
 *
 * Pure functions. Recognition is exact — same hash means the same bytes — so
 * nothing here is a guess, and every claim can be stated with a date and a name.
 */

import type { WorkspaceEvent, WorkspaceFile } from "./model.ts";

export interface PriorResult {
  /** The finished file made from these bytes last time. */
  file: WorkspaceFile;
  /** The tool that made it. */
  toolId: string;
  /** When it was made. */
  at: number;
}

export interface Recognition {
  /** The earlier copy of these exact bytes. */
  original: WorkspaceFile;
  /** When those bytes first arrived. */
  firstSeenAt: number;
  /** Finished work made from them, newest first. */
  results: PriorResult[];
}

/**
 * What Omnio already did with these exact bytes.
 *
 * Returns null when the file is new, when the only other copy is the file
 * itself, or when nothing was ever made from it — in which case there is
 * nothing worth saying, and saying something anyway would be noise.
 *
 * Results whose contents have been evicted are excluded: offering to hand back
 * a file whose bytes are gone is a promise Omnio cannot keep.
 */
export function recognize(
  file: WorkspaceFile,
  files: WorkspaceFile[],
  events: WorkspaceEvent[] = [],
): Recognition | null {
  // Every other record holding the same content.
  const twins = files.filter((other) => other.hash === file.hash && other.id !== file.id);
  if (twins.length === 0) return null;

  const original = twins.reduce((oldest, candidate) =>
    candidate.createdAt < oldest.createdAt ? candidate : oldest,
  );
  // The file in hand is the older copy: there is nothing prior to recognise.
  if (original.createdAt >= file.createdAt) return null;

  const twinIds = new Set(twins.map((twin) => twin.id));
  const producedAt = new Map<string, number>();
  for (const event of events) {
    if (event.type === "produced") producedAt.set(event.fileId, event.at);
  }

  const results: PriorResult[] = files
    .flatMap((candidate) => {
      const from = candidate.derivedFrom;
      if (!from || !twinIds.has(from.fileId)) return [];
      if (candidate.evicted) return [];
      return [
        {
          file: candidate,
          toolId: from.toolId,
          at: producedAt.get(candidate.id) ?? candidate.createdAt,
        },
      ];
    })
    .sort((a, b) => b.at - a.at);

  if (results.length === 0) return null;

  return { original, firstSeenAt: original.createdAt, results };
}

/**
 * Whether running `toolId` on this file would just reproduce something that
 * already exists. Used to offer the finished file instead of the work.
 */
export function alreadyDone(recognition: Recognition | null, toolId: string): PriorResult | null {
  return recognition?.results.find((result) => result.toolId === toolId) ?? null;
}

/* ------------------------------------------------------------- arrivals */

export interface ArrivalGroup {
  files: WorkspaceFile[];
  startedAt: number;
  endedAt: number;
}

/** Files landing within this of each other were part of the same action. */
const SAME_ARRIVAL_MS = 90 * 1000;

/**
 * Files that arrived together.
 *
 * Dropping twelve photos at once is one action, not twelve, and Omnio is the
 * only thing in a position to know that — the timestamps are already recorded.
 * Groups of one are not groups, so they are dropped.
 */
export function arrivalGroups(files: WorkspaceFile[], gapMs = SAME_ARRIVAL_MS): ArrivalGroup[] {
  const imported = files
    .filter((file) => !file.derivedFrom)
    .sort((a, b) => a.createdAt - b.createdAt);

  const groups: ArrivalGroup[] = [];
  for (const file of imported) {
    const current = groups[groups.length - 1];
    if (current && file.createdAt - current.endedAt <= gapMs) {
      current.files.push(file);
      current.endedAt = file.createdAt;
    } else {
      groups.push({ files: [file], startedAt: file.createdAt, endedAt: file.createdAt });
    }
  }
  return groups.filter((group) => group.files.length > 1);
}

/** The arrival group a file belongs to, if it came in with others. */
export function arrivalGroupOf(file: WorkspaceFile, files: WorkspaceFile[]): ArrivalGroup | null {
  return arrivalGroups(files).find((group) => group.files.some((f) => f.id === file.id)) ?? null;
}

/**
 * Recognition from content alone, before the file is even a workspace record.
 *
 * This is what makes the moment land at the drop rather than a click later: the
 * hash of the incoming bytes is enough to know whether this work has been done,
 * so Omnio can lead with the finished file instead of a list of tools.
 */
export function recognizeByHash(
  hash: string,
  files: WorkspaceFile[],
  events: WorkspaceEvent[] = [],
): Recognition | null {
  const twins = files.filter((file) => file.hash === hash);
  if (twins.length === 0) return null;

  const original = twins.reduce((oldest, candidate) =>
    candidate.createdAt < oldest.createdAt ? candidate : oldest,
  );
  const twinIds = new Set(twins.map((twin) => twin.id));

  const producedAt = new Map<string, number>();
  for (const event of events) {
    if (event.type === "produced") producedAt.set(event.fileId, event.at);
  }

  const results: PriorResult[] = files
    .flatMap((candidate) => {
      const from = candidate.derivedFrom;
      if (!from || !twinIds.has(from.fileId) || candidate.evicted) return [];
      return [
        {
          file: candidate,
          toolId: from.toolId,
          at: producedAt.get(candidate.id) ?? candidate.createdAt,
        },
      ];
    })
    .sort((a, b) => b.at - a.at);

  if (results.length === 0) return null;
  return { original, firstSeenAt: original.createdAt, results };
}
