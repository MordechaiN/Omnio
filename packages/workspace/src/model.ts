/**
 * The workspace's permanent data shapes and the pure logic over them.
 *
 * Everything here is deliberately free of OPFS, IndexedDB and React: these are
 * the parts that decide what the user sees — ordering, matching, duplicate
 * grouping, eviction, relationship walking — and they are the parts most worth
 * testing directly. The storage adapters are thin by comparison.
 *
 * See docs/architecture/10-file-workspace.md.
 */

/** A file the user is working with. Bytes live in OPFS, addressed by `hash`. */
export interface WorkspaceFile {
  id: string;
  name: string;
  mime: string;
  size: number;
  /** SHA-256 of the bytes. The identity of the *content*, not of this row. */
  hash: string;
  createdAt: number;
  lastOpenedAt: number;
  pinned: boolean;
  tagIds: string[];
  collectionIds: string[];
  /** Which file and tool produced this one. Absent for imports. */
  derivedFrom?: { fileId: string; toolId: string };
  /** Set once promoted to server storage for a server-tier tool. */
  remote?: { fileObjectId: string; promotedAt: number };
  /** Type-specific facts shown in the Inspector; absent until computed. */
  facts?: FileFacts;
  /** True when the bytes were evicted but the record was kept. */
  evicted?: boolean;
}

/** Type-specific metadata. A union so the Inspector renders what applies. */
export type FileFacts =
  | {
      kind: "image";
      width: number;
      height: number;
      /** Camera/EXIF block present — the privacy signal, wherever it is shown. */
      hasExif?: boolean;
      /** Meaningfully transparent pixels; re-encoding to JPEG would lose them. */
      hasAlpha?: boolean;
    }
  | { kind: "pdf"; pages: number; /** False when no page carries selectable text — i.e. a scan. */ hasText?: boolean }
  | { kind: "audio" | "video"; durationMs: number; width?: number; height?: number }
  | { kind: "text"; lines: number; /** Parsed cleanly, where that applies. */ valid?: boolean }
  | { kind: "other" };

export interface WorkspaceTag {
  id: string;
  name: string;
  color: string;
}

/** A named, re-runnable query. The workspace's answer to folders. */
export interface SavedSearch {
  id: string;
  name: string;
  query: SearchQuery;
  createdAt: number;
}

export interface WorkspaceCollection {
  id: string;
  name: string;
  createdAt: number;
}

export type WorkspaceEventType =
  | "imported"
  | "opened"
  | "produced"
  | "renamed"
  | "tagged"
  | "promoted"
  | "evicted"
  | "deleted";

export interface WorkspaceEvent {
  id: string;
  fileId: string;
  type: WorkspaceEventType;
  toolId?: string;
  /** Free-form detail, e.g. the previous name on a rename. */
  detail?: string;
  at: number;
}

/* ------------------------------------------------------------------ search */

export interface SearchQuery {
  /** Matched against name; case- and diacritic-insensitive, substring. */
  text?: string;
  tagIds?: string[];
  collectionId?: string;
  /** Coarse type filter, matched against the mime's major part or a known kind. */
  kind?: string;
  pinnedOnly?: boolean;
}

/** Normalize for comparison: lowercase, strip diacritics. */
export function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** The coarse bucket a mime type belongs to, used for filtering and icons. */
export function kindOf(mime: string): string {
  if (mime === "application/pdf") return "pdf";
  const [major] = mime.split("/");
  if (major === "image" || major === "audio" || major === "video" || major === "text") return major;
  if (/zip|compressed|tar|rar|7z/.test(mime)) return "archive";
  return "other";
}

/**
 * Filter files against a query. Every clause is AND-ed; an absent clause does
 * not constrain. Tag matching requires *all* named tags, which is what makes
 * tags useful for narrowing rather than just colouring.
 */
export function searchFiles(files: WorkspaceFile[], query: SearchQuery): WorkspaceFile[] {
  const text = query.text ? normalizeText(query.text.trim()) : "";
  return files.filter((file) => {
    if (text && !normalizeText(file.name).includes(text)) return false;
    if (query.pinnedOnly && !file.pinned) return false;
    if (query.kind && kindOf(file.mime) !== query.kind) return false;
    if (query.collectionId && !file.collectionIds.includes(query.collectionId)) return false;
    if (query.tagIds?.length && !query.tagIds.every((id) => file.tagIds.includes(id))) return false;
    return true;
  });
}

export type SortKey = "recent" | "created" | "name" | "size";

/** Pinned files always lead, then the chosen order. */
export function sortFiles(files: WorkspaceFile[], key: SortKey): WorkspaceFile[] {
  const compare = (a: WorkspaceFile, b: WorkspaceFile): number => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    switch (key) {
      case "name":
        return normalizeText(a.name).localeCompare(normalizeText(b.name));
      case "size":
        return b.size - a.size;
      case "created":
        return b.createdAt - a.createdAt;
      default:
        return b.lastOpenedAt - a.lastOpenedAt;
    }
  };
  return [...files].sort(compare);
}

/* -------------------------------------------------------------- duplicates */

/**
 * Group files sharing identical content. Because storage is content-addressed,
 * this is an exact grouping by hash rather than a heuristic — two rows with the
 * same hash are the same bytes, whatever they are named.
 */
export function duplicateGroups(files: WorkspaceFile[]): WorkspaceFile[][] {
  const byHash = new Map<string, WorkspaceFile[]>();
  for (const file of files) {
    const group = byHash.get(file.hash);
    if (group) group.push(file);
    else byHash.set(file.hash, [file]);
  }
  return [...byHash.values()]
    .filter((group) => group.length > 1)
    .map((group) => [...group].sort((a, b) => a.createdAt - b.createdAt));
}

/** Bytes reclaimable by keeping the oldest of each duplicate group. */
export function reclaimableBytes(files: WorkspaceFile[]): number {
  return duplicateGroups(files).reduce((total, group) => total + group[0]!.size * (group.length - 1), 0);
}

/* ----------------------------------------------------------- relationships */

export interface Relations {
  /** The file this one was produced from, if any. */
  parent: WorkspaceFile | null;
  /** Files produced directly from this one. */
  children: WorkspaceFile[];
  /** Other files produced from the same parent. */
  siblings: WorkspaceFile[];
}

export function relationsOf(file: WorkspaceFile, files: WorkspaceFile[]): Relations {
  const byId = new Map(files.map((f) => [f.id, f]));
  const parentId = file.derivedFrom?.fileId;
  const parent = parentId ? byId.get(parentId) ?? null : null;
  const children = files.filter((f) => f.derivedFrom?.fileId === file.id);
  const siblings = parent
    ? files.filter((f) => f.id !== file.id && f.derivedFrom?.fileId === parent.id)
    : [];
  return { parent, children, siblings };
}

/**
 * Walk the full derivation chain from the original down to this file, oldest
 * first. Guards against cycles, which should be impossible but would otherwise
 * hang the Inspector.
 */
export function ancestryOf(file: WorkspaceFile, files: WorkspaceFile[]): WorkspaceFile[] {
  const byId = new Map(files.map((f) => [f.id, f]));
  const chain: WorkspaceFile[] = [];
  const seen = new Set<string>([file.id]);
  let current = file.derivedFrom?.fileId ? byId.get(file.derivedFrom.fileId) : undefined;
  while (current && !seen.has(current.id)) {
    chain.unshift(current);
    seen.add(current.id);
    current = current.derivedFrom?.fileId ? byId.get(current.derivedFrom.fileId) : undefined;
  }
  return chain;
}

/* -------------------------------------------------------------- eviction */

/**
 * Choose files to evict to get back under `budget`, least-recently-opened
 * first. Pinned files are never chosen — that is the entire promise of
 * pinning — and already-evicted rows hold no bytes to reclaim.
 *
 * Returns the ids to evict; an empty array means the budget is already met, or
 * cannot be met without touching pinned files.
 */
export function selectForEviction(files: WorkspaceFile[], budget: number): string[] {
  const live = files.filter((f) => !f.evicted);
  let used = live.reduce((total, f) => total + f.size, 0);
  if (used <= budget) return [];

  const candidates = live
    .filter((f) => !f.pinned)
    .sort((a, b) => a.lastOpenedAt - b.lastOpenedAt);

  const evict: string[] = [];
  for (const file of candidates) {
    if (used <= budget) break;
    evict.push(file.id);
    used -= file.size;
  }
  return evict;
}

/** Bytes actually held, ignoring rows whose content was evicted or shared. */
export function bytesHeld(files: WorkspaceFile[]): number {
  const counted = new Set<string>();
  let total = 0;
  for (const file of files) {
    if (file.evicted || counted.has(file.hash)) continue;
    counted.add(file.hash);
    total += file.size;
  }
  return total;
}
