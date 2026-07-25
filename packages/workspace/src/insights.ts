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

import { duplicateGroups, kindOf, type WorkspaceFile } from "./model.ts";

export type InsightKind =
  | "screenshot"
  | "camera-photo"
  | "scanned-document"
  | "duplicate"
  | "large-file"
  | "oversized-image";

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

const LARGE_FILE_BYTES = 25 * 1024 * 1024;
const OVERSIZED_IMAGE_PIXELS = 12_000_000;

/**
 * Read a file for what it plainly is.
 *
 * `files` is needed only for duplicate detection, which is a property of the
 * set rather than of any one file.
 */
export function insightsFor(file: WorkspaceFile, files: WorkspaceFile[] = []): Insight[] {
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

  if (files.length > 1 && duplicateGroups(files).some((group) => group.some((f) => f.id === file.id))) {
    insights.push({
      kind: "duplicate",
      reason: "Another file holds exactly the same contents",
      weight: 70,
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
