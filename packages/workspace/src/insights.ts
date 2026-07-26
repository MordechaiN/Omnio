/**
 * What Omnio can tell about a file without being told.
 *
 * Every insight carries the evidence that produced it. A suggestion the user
 * cannot account for reads as guessing, and guessing erodes trust faster than
 * silence — so nothing here fires on a hunch, and everything here can be
 * explained in one sentence to the person looking at it.
 *
 * Pure functions over metadata. No engines, no network, no model.
 */

import {
  duplicateGroups,
  kindOf,
  type FileFacts,
  type WorkspaceEvent,
  type WorkspaceFile,
} from "./model.ts";

export type InsightKind =
  | "screenshot"
  | "camera-photo"
  | "scanned-document"
  | "duplicate"
  | "large-file"
  | "location-data"
  | "oversized-image"
  | "oversized-pdf"
  | "long-audio"
  | "huge-archive"
  | "invalid-data";

export interface Insight {
  kind: InsightKind;
  /** Why Omnio believes this, in the user's terms. Never omitted. */
  reason: string;
  /** Tool this insight recommends, when there is an obvious next move. */
  suggests?: string;
  /** Higher shows first. */
  weight: number;
}

/** Screen captures are named remarkably consistently across platforms. */
const SCREENSHOT_NAME = /^(screen[\s_-]?shot|screenshot|cleanshot|snip|capture)/i;
/** Cameras and phones use a small set of stems. */
const CAMERA_NAME = /^(img[_-]?\d|dsc[_-]?\d|dscf|p\d{7}|gopr|dji[_-]|pxl[_-]?\d)/i;

// Around the attachment limit most mail imposes.
const LARGE_FILE_BYTES = 10 * 1024 * 1024;
// 3000px on a side: past this, no screen shows it and every send is slower.
const OVERSIZED_IMAGE_PIXELS = 9_000_000;

/**
 * The least Omnio needs in order to understand a file.
 *
 * Satisfied by a stored `WorkspaceFile` and equally by one that has only just
 * been dropped and has no id yet. The point is that understanding belongs to
 * the file, not to the screen showing it: every surface asks this one engine
 * rather than keeping its own opinions.
 *
 * Before this existed the drop panel carried a second set of thresholds that
 * disagreed with these — a 3 MB, 4000×3000 photo was "large, compress it" on
 * one screen and unremarkable on the other.
 */
export interface FileLike {
  name: string;
  mime: string;
  size: number;
  facts?: FileFacts;
  /** Present once the file is in the workspace; absent for one being dropped. */
  id?: string;
}

/**
 * Read a file for what it plainly is.
 *
 * `files` is needed only for duplicate detection, which is a property of the
 * set rather than of any one file, and is skipped for a file that is not in
 * the workspace yet.
 */
export function insightsFor(file: FileLike, files: WorkspaceFile[] = []): Insight[] {
  const insights: Insight[] = [];
  const kind = kindOf(file.mime);

  if (kind === "image" && SCREENSHOT_NAME.test(file.name)) {
    insights.push({
      kind: "screenshot",
      reason: "Named like a screen capture",
      suggests: "image-crop",
      weight: 60,
    });
  }

  if (kind === "image" && CAMERA_NAME.test(file.name)) {
    insights.push({
      kind: "camera-photo",
      reason: "Named the way cameras and phones name photos",
      suggests: "image-compress",
      weight: 55,
    });
  }

  // A PDF with no selectable text is, in practice, a picture of a document.
  // This is the one insight worth acting on immediately, so it outranks the rest.
  if (file.facts?.kind === "pdf" && file.facts.hasText === false) {
    insights.push({
      kind: "scanned-document",
      reason: "No selectable text — this looks like a scan",
      suggests: "pdf-ocr",
      weight: 90,
    });
  }

  if (
    file.id !== undefined &&
    files.length > 1 &&
    duplicateGroups(files).some((group) => group.some((f) => f.id === file.id))
  ) {
    insights.push({
      kind: "duplicate",
      reason: "Another file holds exactly the same contents",
      weight: 70,
    });
  }

  if (file.facts?.kind === "image" && file.facts.hasExif) {
    insights.push({
      kind: "location-data",
      reason: "Carries camera and possibly location details",
      suggests: "exif-remove",
      weight: 65,
    });
  }

  // These four used to live in a private table belonging to the drop panel, so
  // only that one screen ever mentioned them. They are facts about the file.
  if (kind === "pdf" && file.size > 15 * 1024 * 1024) {
    insights.push({
      kind: "oversized-pdf",
      reason: "Too large for most mail attachments",
      suggests: "pdf-split-size",
      weight: 45,
    });
  }

  if (file.facts?.kind === "audio" && file.facts.durationMs > 10 * 60 * 1000) {
    insights.push({
      kind: "long-audio",
      reason: "Over ten minutes long",
      suggests: "audio-trim",
      weight: 30,
    });
  }

  if (kind === "archive" && file.size > 50 * 1024 * 1024) {
    insights.push({
      kind: "huge-archive",
      reason: "A large archive — worth seeing inside before opening",
      suggests: "zip-extract",
      weight: 28,
    });
  }

  if (file.facts?.kind === "text" && file.facts.valid === false) {
    insights.push({
      kind: "invalid-data",
      reason: "This does not parse — something in it is malformed",
      suggests: "json-format",
      weight: 75,
    });
  }

  if (file.facts?.kind === "image" && file.facts.width * file.facts.height > OVERSIZED_IMAGE_PIXELS) {
    insights.push({
      kind: "oversized-image",
      reason: "Much larger than any screen will show",
      suggests: "image-resize",
      weight: 40,
    });
  } else if (file.size > LARGE_FILE_BYTES) {
    insights.push({
      kind: "large-file",
      reason: "Large enough to be awkward to send",
      suggests: kind === "pdf" ? "pdf-compress" : "image-compress",
      weight: 35,
    });
  }

  return insights.sort((a, b) => b.weight - a.weight);
}

/** The single most useful thing to say about a file, if anything. */
export function primaryInsight(file: WorkspaceFile, files: WorkspaceFile[] = []): Insight | null {
  return insightsFor(file, files)[0] ?? null;
}

/* ------------------------------------------------------------- activity */

export interface ActivityEntry {
  file: WorkspaceFile;
  at: number;
}

/**
 * The files to offer on returning: most recently touched first, one row per
 * file. Evicted files are excluded — offering to continue with something whose
 * contents are gone is a broken promise.
 */
export function recentActivity(files: WorkspaceFile[], limit = 8): ActivityEntry[] {
  return files
    .filter((file) => !file.evicted)
    .map((file) => ({ file, at: Math.max(file.lastOpenedAt, file.createdAt) }))
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
}

/** Headline numbers for the workspace, for a quiet summary rather than a dashboard. */
export interface WorkspaceSummary {
  fileCount: number;
  totalBytes: number;
  duplicateGroups: number;
  reclaimableBytes: number;
}

export function summarize(files: WorkspaceFile[]): WorkspaceSummary {
  const groups = duplicateGroups(files);
  const counted = new Set<string>();
  let totalBytes = 0;
  for (const file of files) {
    if (file.evicted || counted.has(file.hash)) continue;
    counted.add(file.hash);
    totalBytes += file.size;
  }
  return {
    fileCount: files.length,
    totalBytes,
    duplicateGroups: groups.length,
    reclaimableBytes: groups.reduce((total, group) => total + group[0]!.size * (group.length - 1), 0),
  };
}

/* ------------------------------------------------------------ unfinished */

export interface UnfinishedWork {
  file: WorkspaceFile;
  /** The tool it was taken into and never came back from. */
  toolId: string;
  /** When that happened. */
  at: number;
}

/** Below this, the user is still working — saying anything would be nagging. */
const SETTLED_MS = 10 * 60 * 1000;

/**
 * Work that was started and produced nothing.
 *
 * Omnio records when a file is taken into a tool, and separately records every
 * file a tool produces. When the first happened and the second never did, the
 * user opened something, did some work, and walked away without keeping it.
 * Nothing in the product notices that today, and it is the single most annoying
 * thing to rediscover a week later.
 *
 * Only the most recent attempt per file is reported, and only once it has
 * settled — mentioning something the user is doing right now is nagging, not
 * helping.
 */
export function unfinishedWork(
  files: WorkspaceFile[],
  events: WorkspaceEvent[],
  now = Date.now(),
  limit = 4,
  dismissed: string[] = [],
): UnfinishedWork[] {
  const waved = new Set(dismissed);
  const byId = new Map(files.map((file) => [file.id, file]));

  // Every (source file, tool) pair that did produce something.
  const produced = new Set(
    files.flatMap((file) =>
      file.derivedFrom ? [`${file.derivedFrom.fileId}:${file.derivedFrom.toolId}`] : [],
    ),
  );

  const latest = new Map<string, UnfinishedWork>();
  for (const event of events) {
    if (event.type !== "opened" || !event.toolId) continue;
    if (now - event.at < SETTLED_MS) continue;
    if (produced.has(`${event.fileId}:${event.toolId}`)) continue;
    // Waved away, either this exact item or this kind of work entirely.
    if (waved.has(`${event.fileId}:${event.toolId}`) || waved.has(`tool:${event.toolId}`)) continue;
    const file = byId.get(event.fileId);
    if (!file || file.evicted) continue;

    const existing = latest.get(file.id);
    if (!existing || event.at > existing.at) {
      latest.set(file.id, { file, toolId: event.toolId, at: event.at });
    }
  }

  return [...latest.values()].sort((a, b) => b.at - a.at).slice(0, limit);
}
