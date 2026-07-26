/**
 * Workspace Discoveries — what a week of quietly watching would tell you.
 *
 * The other observers in this package look at one thing each: `insights` reads a
 * single file, `recognition` reads a single set of bytes, `chains` reads a single
 * lineage. None of them watch the workspace *over time*, which is where the
 * genuinely useful observations live — the ones a careful colleague would make
 * after a week at the next desk, not the ones a converter website could make from
 * the bytes you just handed it.
 *
 * The bar for adding a detector here is one question: **why is Omnio telling me
 * this?** If the answer is not a concrete thing the person can now do, or a
 * mistake they were about to make, it does not belong here however clever it is.
 * Three ideas were cut for failing that test — "these files share a colour
 * profile", "you work mostly on Tuesdays", "this folder is 40% images" — all
 * true, all observable, none of them worth a single line of anyone's attention.
 *
 * Two rules hold throughout:
 *
 *  - **Nothing fires on a hunch.** Every discovery carries the evidence that
 *    produced it as structured data, so the interface can state the reason in
 *    the user's own language rather than gesturing at one.
 *  - **Nothing is mentioned while it is happening.** Narrating work in progress
 *    is nagging, not observing, so anything still warm is left alone.
 *
 * Pure functions over metadata. No storage, no React, no network, no model.
 */

import { learnChains, stepsThatProduced, type Chain } from "./chains.ts";
import { kindOf, normalizeText, type WorkspaceEvent, type WorkspaceFile } from "./model.ts";

/* --------------------------------------------------------------- shapes */

export type DiscoveryKind =
  | "superseded-export"
  | "document-versions"
  | "image-sizes"
  | "work-session"
  | "stepping-stones"
  | "habit";

interface DiscoveryBase {
  /**
   * Stable across recomputation so a dismissal sticks, but derived from the
   * evidence so that *new* evidence produces a new discovery. Waving away
   * "three versions of Contract" should not silence the fourth.
   */
  id: string;
  /** When the observed thing happened. Orders equally-weighted discoveries. */
  at: number;
  /** Higher surfaces first. */
  weight: number;
  /** The files this is about, most relevant first. */
  files: WorkspaceFile[];
}

/**
 * A result built from a source that has since been replaced.
 *
 * This is the discovery that justifies the whole feature. Omnio records what
 * every output was made from and stores content by hash, so when a new copy of
 * the source appears it can tell that the finished file is now built from stale
 * input — and it is the only thing in a position to know, because it is the only
 * thing that saw both the export and the replacement.
 *
 * The cost of not knowing is sending the wrong PDF to someone.
 */
export interface SupersededExportDiscovery extends DiscoveryBase {
  kind: "superseded-export";
  /** The output that is now out of date. */
  result: WorkspaceFile;
  /** The version of the source it was actually made from. */
  source: WorkspaceFile;
  /** The newer copy of that source, which the result does not reflect. */
  replacement: WorkspaceFile;
  /** The tool that produced `result`, so the fix is one action. */
  toolId: string;
}

/** Several drafts of one document, kept apart from unrelated files of the same type. */
export interface DocumentVersionsDiscovery extends DiscoveryBase {
  kind: "document-versions";
  /** The shared name with version markers removed, e.g. "contract". */
  stem: string;
  /** Newest first — the one they almost certainly want. */
  newest: WorkspaceFile;
  /** Distinct contents in the set; the count people actually mean by "versions". */
  versionCount: number;
}

/** One picture held at several sizes. */
export interface ImageSizesDiscovery extends DiscoveryBase {
  kind: "image-sizes";
  stem: string;
  /** The highest-resolution copy — the one worth keeping. */
  largest: WorkspaceFile;
  /** `${width}×${height}` for each copy, largest first. */
  dimensions: string[];
  /** Bytes freed by keeping only the largest. */
  reclaimableBytes: number;
}

/** A stretch of work, reconstructed from the event log. */
export interface WorkSessionDiscovery extends DiscoveryBase {
  kind: "work-session";
  startedAt: number;
  endedAt: number;
  /** Distinct tools used, in first-use order. */
  toolIds: string[];
  fileCount: number;
}

/**
 * Files that were a step on the way to something else.
 *
 * A file that was produced by a tool, was then used to produce something else,
 * and has not been opened since, is by definition scaffolding: the finished work
 * exists and this is what was left on the way there. Ordinary cleanup cannot see
 * this — it only sees a file that is neither a duplicate nor obviously junk.
 */
export interface SteppingStonesDiscovery extends DiscoveryBase {
  kind: "stepping-stones";
  reclaimableBytes: number;
}

/**
 * Something done consistently enough to be a habit rather than a coincidence.
 *
 * Distinct from Chains, which learn a *sequence* within one lineage. This learns
 * a reflex across unrelated files: what you reliably do to a kind of file when it
 * arrives. The payoff is the files of that kind you have *not* done it to yet.
 */
export interface HabitDiscovery extends DiscoveryBase {
  kind: "habit";
  toolId: string;
  /** The coarse kind this habit applies to, e.g. "image", "pdf". */
  fileKind: string;
  /** How many files of this kind got this treatment. */
  applied: number;
  /** How many were acted on at all — `applied` out of this is the evidence. */
  total: number;
  /** Files of this kind still missing the treatment. The actionable part. */
  pending: WorkspaceFile[];
}

/**
 * A sequence of tools performed more than once, which nobody has saved.
 *
 * Chains already learn sequences from the derivation graph and can re-run them;
 * what has been missing is anyone mentioning that a sequence exists. This is the
 * bridge: the workspace noticed you doing the same three steps twice, and saving
 * that is one click rather than a workflow builder.
 */
export interface RepeatedSequenceDiscovery extends DiscoveryBase {
  kind: "repeated-sequence";
  /** Ordered tool ids, oldest step first. */
  steps: string[];
  /** How many separate files were produced by exactly this sequence. */
  occurrences: number;
  /** Source mime types it has been used on, so the saved chain knows its scope. */
  appliesTo: string[];
}

export type Discovery =
  | SupersededExportDiscovery
  | DocumentVersionsDiscovery
  | ImageSizesDiscovery
  | WorkSessionDiscovery
  | SteppingStonesDiscovery
  | RepeatedSequenceDiscovery
  | HabitDiscovery;

/* ---------------------------------------------------------------- timing */

/** Work newer than this is still in progress; mentioning it would be nagging. */
const SETTLED_MS = 10 * 60 * 1000;
/** A gap longer than this means they got up and did something else. */
const SESSION_GAP_MS = 30 * 60 * 1000;
/** Scaffolding younger than this may still be in use. */
const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ keys */

/**
 * A short, stable key for a set of evidence.
 *
 * FNV-1a rather than a counter or a join: dismissal keys are persisted, so they
 * must be identical across reloads and bounded in length however many files a
 * discovery covers.
 */
function stableKey(parts: string[]): string {
  let hash = 0x811c9dc5;
  for (const part of parts.join("\u0000")) {
    hash ^= part.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/* ----------------------------------------------------------------- names */

/** The filename without its extension. */
export function baseName(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

/** The lowercased extension, or "" when there is none. */
export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/**
 * Explicit version markers only — `(2)`, `copy`, `v3`, `rev2`, `final`, `draft`.
 *
 * Deliberately does **not** strip a bare trailing number. "Chapter 2" and
 * "Chapter 3" are parts of one thing, not drafts of one thing, and announcing
 * them as versions of each other would be confidently wrong — the exact failure
 * that makes a feature like this untrustworthy. A number only counts when
 * bracketed or introduced by a marker word.
 */
const VERSION_MARKER =
  /[\s._-]*(?:\((?:\d{1,3})\)|\[(?:\d{1,3})\]|(?:v|ver|rev|version|revision)[\s._-]?\d{1,3}|copy(?:[\s._-]?\d{1,3})?|final(?:[\s._-]?\d{1,3})?|draft(?:[\s._-]?\d{1,3})?|latest|new|old)$/i;

/**
 * Strip every trailing version marker, e.g. "report v2 final (1)" → "report".
 * Reports whether anything was actually stripped, which is what separates a
 * version set from files that merely share a name.
 */
export function stripVersionMarkers(stem: string): { stem: string; marked: boolean } {
  let current = stem.trim();
  let marked = false;
  // "report final (2)" carries two markers; peel until none remain.
  for (;;) {
    const next = current.replace(VERSION_MARKER, "").trim();
    if (next === current || next.length === 0) break;
    current = next;
    marked = true;
  }
  return { stem: current, marked };
}

/** Size markers a resizer or an export dialog leaves behind. */
const SIZE_TOKEN = /[\s._-]*(?:\d{2,5}\s?[x×]\s?\d{2,5}|@\d[.,]?\d?x|\d{2,5}w|w\d{2,5}|thumb(?:nail)?|small|medium|large|xl|hi[\s._-]?res|lo[\s._-]?res|preview)$/i;

/** Strip trailing size markers, e.g. "hero-1920x1080@2x" → "hero". */
export function stripSizeTokens(stem: string): string {
  let current = stem.trim();
  for (;;) {
    const next = current.replace(SIZE_TOKEN, "").trim();
    if (next === current || next.length === 0) break;
    current = next;
  }
  return current;
}

/* ---------------------------------------------------- superseded exports */

/**
 * Outputs whose source has been replaced since they were made.
 *
 * A replacement is a file with the *same full name* as the source but different
 * contents, which arrived after the output was produced. Same name and different
 * bytes is about as close to certainty as filenames get; anything looser (same
 * stem, similar name) would start guessing, and a wrong "your export is out of
 * date" is worse than silence.
 *
 * Suppressed once the work has already been redone — an output produced from the
 * replacement by the same tool means the person is ahead of us, and repeating the
 * warning would make Omnio look like it was not paying attention.
 */
interface SupersedeIndex {
  byId: Map<string, WorkspaceFile>;
  /** Files bucketed by normalized name — the only candidates for a replacement. */
  byName: Map<string, WorkspaceFile[]>;
  /** Every (source, tool) pair that has already been re-run. */
  producedFrom: Set<string>;
}

function supersedeIndex(files: WorkspaceFile[]): SupersedeIndex {
  const byName = new Map<string, WorkspaceFile[]>();
  for (const file of files) {
    const key = normalizeText(file.name);
    const bucket = byName.get(key);
    if (bucket) bucket.push(file);
    else byName.set(key, [file]);
  }
  return {
    byId: new Map(files.map((file) => [file.id, file])),
    byName,
    producedFrom: new Set(
      files.flatMap((file) =>
        file.derivedFrom ? [`${file.derivedFrom.fileId}:${file.derivedFrom.toolId}`] : [],
      ),
    ),
  };
}

/** The check itself, shared by the whole-workspace sweep and the single-file lookup. */
function supersededIn(
  result: WorkspaceFile,
  index: SupersedeIndex,
  now: number,
): SupersededExportDiscovery | null {
  if (!result.derivedFrom || result.evicted) return null;
  if (now - result.createdAt < SETTLED_MS) return null;

  const source = index.byId.get(result.derivedFrom.fileId);
  if (!source) return null;

  const replacement = (index.byName.get(normalizeText(source.name)) ?? [])
    .filter(
      (candidate) =>
        candidate.id !== source.id &&
        candidate.hash !== source.hash &&
        candidate.createdAt > result.createdAt &&
        // A file derived from this result is a descendant, not a new source.
        candidate.id !== result.id,
    )
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  if (!replacement) return null;

  // Already redone against the newer source — nothing to say.
  if (index.producedFrom.has(`${replacement.id}:${result.derivedFrom.toolId}`)) return null;

  return {
    kind: "superseded-export",
    id: `superseded-export:${stableKey([result.id, replacement.id])}`,
    at: replacement.createdAt,
    // The highest weight in the feature: this is the only discovery that
    // prevents a mistake rather than merely saving effort.
    weight: 95,
    files: [result, replacement, source],
    result,
    source,
    replacement,
    toolId: result.derivedFrom.toolId,
  };
}

export function supersededExports(files: WorkspaceFile[], now = Date.now()): SupersededExportDiscovery[] {
  const index = supersedeIndex(files);
  return files
    .flatMap((result) => supersededIn(result, index, now) ?? [])
    .sort((a, b) => b.at - a.at);
}

/**
 * Whether this one file is a result built from a source that has since changed.
 *
 * The same observation as the Home surface, asked about a single file — because
 * the moment it actually matters is when someone reaches for the file, not when
 * they happen to glance at a list. Being told at the point of use is the whole
 * difference between a report and an assistant.
 */
export function supersededExportOf(
  file: WorkspaceFile,
  files: WorkspaceFile[],
  now = Date.now(),
): SupersededExportDiscovery | null {
  return supersededIn(file, supersedeIndex(files), now);
}

/* ------------------------------------------------------------- versions */

/**
 * Sets of files that are drafts of one document.
 *
 * Qualifies on either of two honest signals: an explicit version marker in at
 * least one name, or two files with the *identical* name and different contents
 * — which is what a second download of an edited document looks like. Same
 * extension is required, because "report.docx" and "report.pdf" are a conversion
 * (already visible as a relationship) rather than a revision.
 */
export function documentVersions(files: WorkspaceFile[]): DocumentVersionsDiscovery[] {
  interface Group {
    stem: string;
    members: WorkspaceFile[];
    marked: boolean;
    identicalNames: boolean;
  }

  const groups = new Map<string, Group>();
  for (const file of files) {
    if (file.evicted) continue;
    // Outputs are not drafts. "scan.pdf" and the "scan-final.pdf" eventually made
    // from it share a stem and differ in content, but they are one lineage — which
    // the workspace already shows — not two versions of the same document. Calling
    // a file and its own descendant "2 versions" is the sort of confidently wrong
    // statement that costs more trust than the feature earns.
    if (file.derivedFrom) continue;
    // Media and archives are not documents; version-naming there means something else.
    const kind = kindOf(file.mime);
    if (kind === "image" || kind === "audio" || kind === "video" || kind === "archive") continue;

    const extension = extensionOf(file.name);
    const { stem, marked } = stripVersionMarkers(baseName(file.name));
    const key = `${normalizeText(stem)}.${extension}`;

    const group = groups.get(key);
    if (group) {
      group.identicalNames ||= group.members.some(
        (member) => normalizeText(member.name) === normalizeText(file.name),
      );
      group.members.push(file);
      group.marked ||= marked;
    } else {
      groups.set(key, { stem, members: [file], marked, identicalNames: false });
    }
  }

  const found: DocumentVersionsDiscovery[] = [];
  for (const group of groups.values()) {
    if (group.members.length < 2) continue;
    if (!group.marked && !group.identicalNames) continue;

    const distinct = new Set(group.members.map((member) => member.hash));
    // Identical bytes under different names are duplicates, which the workspace
    // already reports. Versions means the contents actually differ.
    if (distinct.size < 2) continue;

    const ordered = [...group.members].sort((a, b) => b.createdAt - a.createdAt);
    const newest = ordered[0]!;
    found.push({
      kind: "document-versions",
      id: `document-versions:${stableKey(ordered.map((file) => file.id).sort())}`,
      at: newest.createdAt,
      weight: 70,
      files: ordered,
      stem: group.stem,
      newest,
      versionCount: distinct.size,
    });
  }

  return found.sort((a, b) => b.at - a.at);
}

/* ---------------------------------------------------------- image sizes */

/** Aspect ratios within this of each other are the same shape. */
const ASPECT_TOLERANCE = 0.02;

/**
 * One image kept at several resolutions.
 *
 * Requires a shared name once size markers are stripped *and* a matching aspect
 * ratio: either alone produces nonsense — every 16:9 screenshot shares a shape,
 * and "logo.png" versus "logo.svg" share a name without being the same picture.
 *
 * Sets already connected by derivation are skipped. The Inspector shows that
 * relationship, and repeating it here would be Omnio telling you something you
 * can already see.
 */
export function imageSizeSets(files: WorkspaceFile[]): ImageSizesDiscovery[] {
  const groups = new Map<string, WorkspaceFile[]>();
  for (const file of files) {
    if (file.evicted || file.facts?.kind !== "image") continue;
    const key = normalizeText(stripSizeTokens(baseName(file.name)));
    if (key.length === 0) continue;
    const group = groups.get(key);
    if (group) group.push(file);
    else groups.set(key, [file]);
  }

  const found: ImageSizesDiscovery[] = [];
  for (const [key, members] of groups) {
    if (members.length < 2) continue;

    const ids = new Set(members.map((member) => member.id));
    const related = members.some((member) => member.derivedFrom && ids.has(member.derivedFrom.fileId));
    if (related) continue;

    const sized = members
      .map((file) => ({ file, facts: file.facts as { kind: "image"; width: number; height: number } }))
      .filter((entry) => entry.facts.width > 0 && entry.facts.height > 0)
      .sort((a, b) => b.facts.width * b.facts.height - a.facts.width * a.facts.height);
    if (sized.length < 2) continue;

    const ratio = sized[0]!.facts.width / sized[0]!.facts.height;
    const sameShape = sized.every(
      (entry) => Math.abs(entry.facts.width / entry.facts.height - ratio) / ratio <= ASPECT_TOLERANCE,
    );
    if (!sameShape) continue;

    const distinctSizes = new Set(sized.map((entry) => `${entry.facts.width}x${entry.facts.height}`));
    if (distinctSizes.size < 2) continue;

    const largest = sized[0]!.file;
    found.push({
      kind: "image-sizes",
      id: `image-sizes:${stableKey(sized.map((entry) => entry.file.id).sort())}`,
      at: Math.max(...sized.map((entry) => entry.file.createdAt)),
      weight: 55,
      files: sized.map((entry) => entry.file),
      stem: key,
      largest,
      dimensions: sized.map((entry) => `${entry.facts.width}×${entry.facts.height}`),
      reclaimableBytes: sized.slice(1).reduce((total, entry) => total + entry.file.size, 0),
    });
  }

  return found.sort((a, b) => b.at - a.at);
}

/* -------------------------------------------------------------- sessions */

/** Event types that represent someone working, as opposed to housekeeping. */
const WORK_EVENTS = new Set(["imported", "opened", "produced", "renamed", "tagged"]);

/**
 * Stretches of work, rebuilt from the event log.
 *
 * "What was I doing on Thursday?" is a real question with a real answer that
 * nothing currently surfaces. A session needs enough substance to be worth
 * recalling — several files, or genuine tool use — otherwise every stray glance
 * at a file becomes an entry.
 *
 * The session in progress is excluded. Telling someone what they are doing right
 * now is the difference between an observation and a running commentary.
 */
export function workSessions(
  files: WorkspaceFile[],
  events: WorkspaceEvent[],
  now = Date.now(),
): WorkSessionDiscovery[] {
  const byId = new Map(files.map((file) => [file.id, file]));
  const ordered = events
    .filter((event) => WORK_EVENTS.has(event.type))
    .sort((a, b) => a.at - b.at);

  interface Bucket {
    startedAt: number;
    endedAt: number;
    fileIds: string[];
    toolIds: string[];
  }

  const buckets: Bucket[] = [];
  for (const event of ordered) {
    const current = buckets[buckets.length - 1];
    if (current && event.at - current.endedAt <= SESSION_GAP_MS) {
      current.endedAt = event.at;
      if (!current.fileIds.includes(event.fileId)) current.fileIds.push(event.fileId);
      if (event.toolId && !current.toolIds.includes(event.toolId)) current.toolIds.push(event.toolId);
    } else {
      buckets.push({
        startedAt: event.at,
        endedAt: event.at,
        fileIds: [event.fileId],
        toolIds: event.toolId ? [event.toolId] : [],
      });
    }
  }

  return buckets
    .filter((bucket) => now - bucket.endedAt >= SETTLED_MS)
    .filter((bucket) => bucket.fileIds.length >= 3 || bucket.toolIds.length >= 2)
    .map((bucket) => {
      // Files deleted since the session are simply not shown; the session still
      // happened, and its remaining files are still a way back into the work.
      const present = bucket.fileIds.flatMap((id) => {
        const file = byId.get(id);
        return file && !file.evicted ? [file] : [];
      });
      return {
        kind: "work-session" as const,
        id: `work-session:${stableKey([String(bucket.startedAt), ...bucket.fileIds.slice(0, 8)])}`,
        at: bucket.endedAt,
        weight: 45,
        files: present,
        startedAt: bucket.startedAt,
        endedAt: bucket.endedAt,
        toolIds: bucket.toolIds,
        fileCount: present.length,
      };
    })
    .filter((session) => session.files.length >= 2)
    .sort((a, b) => b.at - a.at);
}

/* -------------------------------------------------------- stepping stones */

/**
 * Intermediate files left behind by finished work.
 *
 * Produced by a tool, used to produce something else, never opened again, and
 * old enough that the work is plainly over. Every one of those conditions is
 * needed: without the second it is someone's output, and without the third it is
 * something they are still using.
 *
 * Reported as one group rather than one discovery per file — six separate
 * notices about six leftovers is precisely the kind of noise this feature exists
 * to avoid.
 */
export function steppingStones(
  files: WorkspaceFile[],
  now = Date.now(),
): SteppingStonesDiscovery[] {
  const hasChildren = new Set(files.flatMap((file) => (file.derivedFrom ? [file.derivedFrom.fileId] : [])));

  const stones = files
    .filter(
      (file) =>
        file.derivedFrom !== undefined &&
        hasChildren.has(file.id) &&
        !file.pinned &&
        !file.evicted &&
        // Never returned to since it was produced.
        file.lastOpenedAt <= file.createdAt &&
        now - file.createdAt >= STALE_AFTER_MS,
    )
    .sort((a, b) => b.size - a.size);

  if (stones.length < 2) return [];

  return [
    {
      kind: "stepping-stones",
      id: `stepping-stones:${stableKey(stones.map((file) => file.id).sort())}`,
      at: Math.max(...stones.map((file) => file.createdAt)),
      weight: 40,
      files: stones,
      reclaimableBytes: stones.reduce((total, file) => total + file.size, 0),
    },
  ];
}

/* ----------------------------------------------------------- sequences */

/** Doing something twice is a pattern; doing it once is just doing it. */
const SEQUENCE_MIN_RUNS = 2;

/**
 * Sequences performed more than once that are not saved as chains yet.
 *
 * Deliberately built on `learnChains` rather than a second implementation of the
 * same idea: the graph walk that finds a sequence is already correct and tested,
 * and a discovery that disagreed with the chain it offers to save would be worse
 * than no discovery at all.
 */
export function repeatedSequences(
  files: WorkspaceFile[],
  chains: Chain[] = [],
): RepeatedSequenceDiscovery[] {
  const saved = new Set(chains.map((chain) => chain.steps.join("→")));

  return learnChains(files, SEQUENCE_MIN_RUNS)
    .filter((candidate) => !saved.has(candidate.steps.join("→")))
    .map((candidate) => {
      const key = candidate.steps.join("→");
      // The files this sequence actually produced, for the date and the names.
      const produced = files.filter(
        (file) => !file.evicted && stepsThatProduced(file, files).join("→") === key,
      );
      return {
        kind: "repeated-sequence" as const,
        id: `repeated-sequence:${stableKey(candidate.steps)}`,
        at: produced.length > 0 ? Math.max(...produced.map((file) => file.createdAt)) : 0,
        weight: 65,
        files: produced.sort((a, b) => b.createdAt - a.createdAt),
        steps: candidate.steps,
        occurrences: candidate.occurrences,
        appliesTo: candidate.sourceMimes,
      };
    })
    .sort((a, b) => b.occurrences - a.occurrences || b.at - a.at);
}

/* ---------------------------------------------------------------- habits */

/** Below this, a repetition is a coincidence rather than a habit. */
const HABIT_MIN_RUNS = 3;
/** How consistent it must be before Omnio is willing to call it a habit. */
const HABIT_CONSISTENCY = 0.8;

/**
 * The thing you reliably do to a kind of file when it arrives.
 *
 * Chains learn a sequence within one lineage; this learns a reflex across
 * unrelated files. The useful part is not the observation but its remainder: the
 * files of that kind still sitting there without the treatment everything else
 * got.
 *
 * A habit with nothing left to apply it to is not reported. Being told you have
 * a habit, with nothing to do about it, is a horoscope.
 */
export function habits(files: WorkspaceFile[], now = Date.now()): HabitDiscovery[] {
  const firstToolFor = new Map<string, { toolId: string; at: number }>();
  for (const file of files) {
    const from = file.derivedFrom;
    if (!from) continue;
    const existing = firstToolFor.get(from.fileId);
    if (!existing || file.createdAt < existing.at) {
      firstToolFor.set(from.fileId, { toolId: from.toolId, at: file.createdAt });
    }
  }

  interface Bucket {
    counts: Map<string, number>;
    acted: number;
    untouched: WorkspaceFile[];
    at: number;
  }

  const byKind = new Map<string, Bucket>();
  for (const file of files) {
    // Imports only: what someone does to a file they brought in is a choice,
    // what happens to a generated file is usually the middle of a chain.
    if (file.derivedFrom || file.evicted) continue;
    const kind = kindOf(file.mime);
    const bucket: Bucket = byKind.get(kind) ?? { counts: new Map(), acted: 0, untouched: [], at: 0 };

    const first = firstToolFor.get(file.id);
    if (first) {
      bucket.counts.set(first.toolId, (bucket.counts.get(first.toolId) ?? 0) + 1);
      bucket.acted += 1;
      bucket.at = Math.max(bucket.at, first.at);
    } else if (now - file.createdAt >= SETTLED_MS) {
      bucket.untouched.push(file);
    }
    byKind.set(kind, bucket);
  }

  const found: HabitDiscovery[] = [];
  for (const [kind, bucket] of byKind) {
    if (bucket.acted < HABIT_MIN_RUNS || bucket.untouched.length === 0) continue;

    const [toolId, applied] = [...bucket.counts.entries()].sort((a, b) => b[1] - a[1])[0]!;
    if (applied < HABIT_MIN_RUNS || applied / bucket.acted < HABIT_CONSISTENCY) continue;

    const pending = [...bucket.untouched].sort((a, b) => b.createdAt - a.createdAt);
    found.push({
      kind: "habit",
      id: `habit:${stableKey([kind, toolId, ...pending.map((file) => file.id).sort()])}`,
      at: bucket.at,
      weight: 60,
      files: pending,
      toolId,
      fileKind: kind,
      applied,
      total: bucket.acted,
      pending,
    });
  }

  return found.sort((a, b) => b.at - a.at);
}

/* ------------------------------------------------------------ aggregate */

export interface DiscoverOptions {
  now?: number;
  /** Discovery ids the user has waved away. */
  dismissed?: string[];
  /** Most discoveries to return. The surface is a quiet list, not a feed. */
  limit?: number;
  /** Already-saved chains, so a sequence is not offered twice. */
  chains?: Chain[];
}

/**
 * Everything worth mentioning, most useful first.
 *
 * Ordered by weight and then recency, then capped. The cap is the point: a
 * workspace with fifty observations in it should still present as a short,
 * readable list, because a discoveries panel nobody finishes reading is a
 * notifications panel.
 */
export function discover(
  files: WorkspaceFile[],
  events: WorkspaceEvent[] = [],
  options: DiscoverOptions = {},
): Discovery[] {
  const { now = Date.now(), dismissed = [], limit = 6, chains = [] } = options;
  const waved = new Set(dismissed);

  const superseded = supersededExports(files, now);

  /**
   * "A newer version of this arrived" and "this document has two versions" are
   * the same fact stated twice, and the first is strictly more useful because it
   * names the consequence. Where they cover the same files, only the first is
   * kept — a quiet surface must not say one thing in two rows.
   */
  const explained = new Set(superseded.flatMap((d) => [d.source.id, d.replacement.id]));
  const versions = documentVersions(files).filter(
    (discovery) => !discovery.files.every((file) => explained.has(file.id)),
  );

  const all: Discovery[] = [
    ...superseded,
    ...repeatedSequences(files, chains),
    ...habits(files, now),
    ...versions,
    ...imageSizeSets(files),
    ...workSessions(files, events, now),
    ...steppingStones(files, now),
  ];

  return all
    .filter((discovery) => !waved.has(discovery.id) && !waved.has(`kind:${discovery.kind}`))
    .sort((a, b) => b.weight - a.weight || b.at - a.at)
    .slice(0, limit);
}
