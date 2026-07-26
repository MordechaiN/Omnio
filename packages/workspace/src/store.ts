/**
 * The workspace store: one in-memory snapshot over IndexedDB + OPFS.
 *
 * Metadata is small (a few hundred bytes per file), so the whole set is held in
 * memory and served synchronously. That is what keeps the UI free of loading
 * spinners: selecting a file, filtering, or opening the Inspector never awaits
 * anything. Only bytes and thumbnails are fetched lazily.
 *
 * The snapshot is replaced, never mutated, so `useSyncExternalStore` can compare
 * by identity and React re-renders exactly the subscribers that care.
 */

import {
  deleteBlob,
  getBlobAsFile,
  hashBytes,
  isOpfsAvailable,
  putBlob,
  requestPersistence,
} from "./blobs.ts";
import type { Chain } from "./chains.ts";
import * as db from "./db.ts";
import {
  selectForEviction,
  type FileFacts,
  type WorkspaceCollection,
  type WorkspaceEvent,
  type WorkspaceEventType,
  type SavedSearch,
  type SearchQuery,
  type WorkspaceFile,
  type WorkspaceTag,
} from "./model.ts";

export interface WorkspaceSnapshot {
  files: WorkspaceFile[];
  tags: WorkspaceTag[];
  collections: WorkspaceCollection[];
  events: WorkspaceEvent[];
  searches: SavedSearch[];
  chains: Chain[];
  /** Suggestions the user has told Omnio to stop offering. */
  dismissed: string[];
  ready: boolean;
  /** False when the browser denies OPFS/IndexedDB (e.g. some private modes). */
  supported: boolean;
}

const EMPTY: WorkspaceSnapshot = {
  files: [],
  tags: [],
  collections: [],
  events: [],
  searches: [],
  chains: [],
  dismissed: [],
  ready: false,
  supported: true,
};

/** Time-ordered id: sorts by creation without a separate index. */
function newId(): string {
  const random =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  return `${Date.now().toString(36)}${random}`;
}

export interface ProduceInput {
  name: string;
  mime: string;
  /** The file this output was produced from. */
  fromFileId?: string;
  toolId?: string;
}

class WorkspaceStore {
  private snapshot: WorkspaceSnapshot = EMPTY;
  private listeners = new Set<() => void>();
  private loading: Promise<void> | null = null;

  getSnapshot = (): WorkspaceSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private commit(next: Partial<WorkspaceSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...next };
    for (const listener of this.listeners) listener();
  }

  /** Load metadata once. Safe to call from every mounted component. */
  load = (): Promise<void> => {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      if (!isOpfsAvailable() || !db.isIndexedDbAvailable()) {
        this.commit({ ready: true, supported: false });
        return;
      }
      void requestPersistence();
      const [files, tags, collections, events, searches, chains, dismissedRecords] = await Promise.all([
        db.getAllFiles(),
        db.getAllTags(),
        db.getAllCollections(),
        db.getAllEvents(),
        db.getAllSearches(),
        db.getAllChains(),
        db.getAllDismissed(),
      ]);
      this.commit({
        files,
        tags,
        collections,
        events,
        searches,
        chains,
        dismissed: dismissedRecords.map((record) => record.key),
        ready: true,
        supported: true,
      });
    })();
    return this.loading;
  };

  private async record(fileId: string, type: WorkspaceEventType, toolId?: string, detail?: string) {
    const event: WorkspaceEvent = { id: newId(), fileId, type, toolId, detail, at: Date.now() };
    await db.appendEvent(event);
    this.commit({ events: [...this.snapshot.events, event] });
  }

  private async upsert(file: WorkspaceFile): Promise<void> {
    await db.putFile(file);
    const files = this.snapshot.files.some((f) => f.id === file.id)
      ? this.snapshot.files.map((f) => (f.id === file.id ? file : f))
      : [...this.snapshot.files, file];
    this.commit({ files });
  }

  /* ------------------------------------------------------------- import */

  /**
   * Bring a file into the workspace. Identical content is stored once; a second
   * import of the same bytes creates a new record pointing at the existing blob.
   */
  import = async (source: File, origin?: { fromFileId?: string; toolId?: string }): Promise<WorkspaceFile> => {
    const buffer = await source.arrayBuffer();
    const hash = await hashBytes(buffer);
    await putBlob(hash, new Blob([buffer], { type: source.type }));

    const now = Date.now();
    const file: WorkspaceFile = {
      id: newId(),
      name: source.name || "Untitled",
      mime: source.type || "application/octet-stream",
      size: source.size,
      hash,
      createdAt: now,
      lastOpenedAt: now,
      pinned: false,
      tagIds: [],
      collectionIds: [],
      ...(origin?.fromFileId && origin.toolId
        ? { derivedFrom: { fileId: origin.fromFileId, toolId: origin.toolId } }
        : {}),
    };
    await this.upsert(file);
    await this.record(file.id, origin?.fromFileId ? "produced" : "imported", origin?.toolId);
    return file;
  };

  /** Store a tool's output as a new workspace file, linked to its input. */
  produce = async (bytes: BlobPart, input: ProduceInput): Promise<WorkspaceFile> => {
    const file = new File([bytes], input.name, { type: input.mime });
    return this.import(file, { fromFileId: input.fromFileId, toolId: input.toolId });
  };

  /* --------------------------------------------------------------- read */

  /**
   * Get the content back as a real `File` — the type every existing tool
   * already accepts — and mark it opened so Recent stays meaningful.
   */
  openFile = async (id: string, toolId?: string): Promise<File | null> => {
    const file = this.snapshot.files.find((f) => f.id === id);
    if (!file) return null;
    const handle = await getBlobAsFile(file.hash, file.name, file.mime);
    if (!handle) return null;
    await this.upsert({ ...file, lastOpenedAt: Date.now(), evicted: false });
    await this.record(id, "opened", toolId);
    return handle;
  };

  /** Read content without recording an open — for thumbnails and previews. */
  peekFile = async (id: string): Promise<File | null> => {
    const file = this.snapshot.files.find((f) => f.id === id);
    return file ? getBlobAsFile(file.hash, file.name, file.mime) : null;
  };

  /* ------------------------------------------------------------- mutate */

  rename = async (id: string, name: string): Promise<void> => {
    const file = this.snapshot.files.find((f) => f.id === id);
    if (!file || name.trim() === "" || name === file.name) return;
    await this.upsert({ ...file, name: name.trim() });
    await this.record(id, "renamed", undefined, file.name);
  };

  setPinned = async (id: string, pinned: boolean): Promise<void> => {
    const file = this.snapshot.files.find((f) => f.id === id);
    if (file) await this.upsert({ ...file, pinned });
  };

  setFacts = async (id: string, facts: FileFacts): Promise<void> => {
    const file = this.snapshot.files.find((f) => f.id === id);
    if (file) await this.upsert({ ...file, facts });
  };

  toggleTag = async (id: string, tagId: string): Promise<void> => {
    const file = this.snapshot.files.find((f) => f.id === id);
    if (!file) return;
    const tagIds = file.tagIds.includes(tagId)
      ? file.tagIds.filter((t) => t !== tagId)
      : [...file.tagIds, tagId];
    await this.upsert({ ...file, tagIds });
    await this.record(id, "tagged");
  };

  setCollection = async (id: string, collectionId: string, member: boolean): Promise<void> => {
    const file = this.snapshot.files.find((f) => f.id === id);
    if (!file) return;
    const collectionIds = member
      ? [...new Set([...file.collectionIds, collectionId])]
      : file.collectionIds.filter((c) => c !== collectionId);
    await this.upsert({ ...file, collectionIds });
  };

  createTag = async (name: string, color: string): Promise<WorkspaceTag> => {
    const tag: WorkspaceTag = { id: newId(), name: name.trim(), color };
    await db.putTag(tag);
    this.commit({ tags: [...this.snapshot.tags, tag] });
    return tag;
  };

  createCollection = async (name: string): Promise<WorkspaceCollection> => {
    const collection: WorkspaceCollection = { id: newId(), name: name.trim(), createdAt: Date.now() };
    await db.putCollection(collection);
    this.commit({ collections: [...this.snapshot.collections, collection] });
    return collection;
  };

  /**
   * Copy a file as a new record. The bytes are shared, not re-written: content
   * addressing means a duplicate costs a row, not a second copy on disk.
   */
  duplicate = async (id: string): Promise<WorkspaceFile | null> => {
    const file = this.snapshot.files.find((f) => f.id === id);
    if (!file) return null;
    const now = Date.now();
    const copy: WorkspaceFile = {
      ...file,
      id: newId(),
      name: copyName(file.name),
      createdAt: now,
      lastOpenedAt: now,
      pinned: false,
    };
    await this.upsert(copy);
    await this.record(copy.id, "imported");
    return copy;
  };

  /**
   * Stop offering something. Dismissals are kept rather than inferred: a
   * suggestion the user has waved away must stay away, and guessing that from
   * behaviour would be exactly the kind of cleverness that erodes trust.
   */
  dismiss = async (key: string): Promise<void> => {
    if (this.snapshot.dismissed.includes(key)) return;
    await db.putDismissed({ key, at: Date.now() });
    this.commit({ dismissed: [...this.snapshot.dismissed, key] });
  };

  clearDismissed = async (): Promise<void> => {
    await db.clearDismissed();
    this.commit({ dismissed: [] });
  };

  saveChain = async (chain: Chain): Promise<void> => {
    await db.putChain(chain);
    const chains = this.snapshot.chains.some((c) => c.id === chain.id)
      ? this.snapshot.chains.map((c) => (c.id === chain.id ? chain : c))
      : [...this.snapshot.chains, chain];
    this.commit({ chains });
  };

  removeChain = async (id: string): Promise<void> => {
    await db.deleteChain(id);
    this.commit({ chains: this.snapshot.chains.filter((c) => c.id !== id) });
  };

  /** A stable id for new records, exposed so callers can build a Chain. */
  newId = (): string => newId();

  saveSearch = async (name: string, query: SearchQuery): Promise<SavedSearch> => {
    const search: SavedSearch = { id: newId(), name: name.trim(), query, createdAt: Date.now() };
    await db.putSearch(search);
    this.commit({ searches: [...this.snapshot.searches, search] });
    return search;
  };

  removeSearch = async (id: string): Promise<void> => {
    await db.deleteSearch(id);
    this.commit({ searches: this.snapshot.searches.filter((s) => s.id !== id) });
  };

  /**
   * Delete a record, and its blob only when nothing else references that
   * content — two rows sharing a hash are the same bytes, and dropping one must
   * not pull the content out from under the other.
   */
  remove = async (id: string): Promise<void> => {
    const file = this.snapshot.files.find((f) => f.id === id);
    if (!file) return;
    await db.deleteFileRecord(id);
    await db.deleteThumb(id);
    if ((await db.countByHash(file.hash)) === 0) await deleteBlob(file.hash);
    this.commit({ files: this.snapshot.files.filter((f) => f.id !== id) });
  };

  /* ------------------------------------------------------------ actions */

  /**
   * Group files under a new collection, in one step.
   *
   * Creating a collection and then assigning files to it are two operations the
   * user would otherwise perform by hand, once per file. Returning the
   * collection lets the caller offer an undo that is genuinely complete.
   */
  collect = async (name: string, fileIds: string[]): Promise<WorkspaceCollection> => {
    const collection = await this.createCollection(name);
    for (const id of fileIds) await this.setCollection(id, collection.id, true);
    return collection;
  };

  /** Delete a collection and remove every file's membership of it. */
  uncollect = async (collectionId: string): Promise<void> => {
    for (const file of this.snapshot.files) {
      if (file.collectionIds.includes(collectionId)) {
        await this.setCollection(file.id, collectionId, false);
      }
    }
    await db.deleteCollection(collectionId);
    this.commit({ collections: this.snapshot.collections.filter((c) => c.id !== collectionId) });
  };

  /**
   * Drop the bytes of specific files while keeping every record.
   *
   * The row, its history and its place in the derivation graph all survive — the
   * workspace's memory is not what is being reclaimed, only the storage. This is
   * eviction aimed at a chosen set rather than at a budget, which is what an
   * action can offer and a background policy cannot.
   *
   * Pinned files are skipped rather than refused: pinning is a promise that the
   * contents stay, and an action that quietly broke it would be the worst kind
   * of bug to find later.
   */
  archive = async (ids: string[]): Promise<string[]> => {
    const archived: string[] = [];
    for (const id of ids) {
      const file = this.snapshot.files.find((f) => f.id === id);
      if (!file || file.pinned || file.evicted) continue;
      // Shared content: only drop the blob when this was the last reference.
      if ((await db.countByHash(file.hash)) <= 1) await deleteBlob(file.hash);
      await this.upsert({ ...file, evicted: true });
      await this.record(id, "evicted");
      archived.push(id);
    }
    return archived;
  };

  /* ----------------------------------------------------------- eviction */

  /** Drop the bytes of the least-recently-used unpinned files to fit `budget`. */
  evictToBudget = async (budget: number): Promise<string[]> => {
    const ids = selectForEviction(this.snapshot.files, budget);
    for (const id of ids) {
      const file = this.snapshot.files.find((f) => f.id === id);
      if (!file) continue;
      if ((await db.countByHash(file.hash)) <= 1) await deleteBlob(file.hash);
      await this.upsert({ ...file, evicted: true });
      await this.record(id, "evicted");
    }
    return ids;
  };
}

/** "report.pdf" → "report copy.pdf", matching desktop conventions. */
function copyName(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return `${name} copy`;
  return `${name.slice(0, dot)} copy${name.slice(dot)}`;
}

export const workspace = new WorkspaceStore();
export type { WorkspaceStore };
