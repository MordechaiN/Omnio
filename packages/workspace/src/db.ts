/**
 * IndexedDB adapter for workspace metadata.
 *
 * OPFS holds bytes but has no index, so everything queryable lives here:
 * file records, tags, collections, the event log, and rendered thumbnails.
 * Thumbnails sit beside the metadata rather than in OPFS so that painting a
 * grid of hundreds of files is one cursor walk instead of hundreds of file
 * handle opens.
 */

import type { WorkspaceCollection, WorkspaceEvent, WorkspaceFile, WorkspaceTag } from "./model.ts";

const DB_NAME = "omnio-workspace";
const DB_VERSION = 1;

export const STORE_FILES = "files";
export const STORE_TAGS = "tags";
export const STORE_COLLECTIONS = "collections";
export const STORE_EVENTS = "events";
export const STORE_THUMBS = "thumbs";

export interface ThumbRecord {
  fileId: string;
  blob: Blob;
  width: number;
  height: number;
}

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

let cached: Promise<IDBDatabase> | null = null;

export function openWorkspaceDb(): Promise<IDBDatabase> {
  if (cached) return cached;
  cached = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        const files = db.createObjectStore(STORE_FILES, { keyPath: "id" });
        // hash: duplicate detection and reference counting before a blob delete.
        files.createIndex("hash", "hash", { unique: false });
        // lastOpenedAt: the Recent view and eviction order.
        files.createIndex("lastOpenedAt", "lastOpenedAt", { unique: false });
        // derivedFrom.fileId: the relationship graph in the Inspector.
        files.createIndex("parent", "derivedFrom.fileId", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_TAGS)) {
        db.createObjectStore(STORE_TAGS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_COLLECTIONS)) {
        db.createObjectStore(STORE_COLLECTIONS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_EVENTS)) {
        const events = db.createObjectStore(STORE_EVENTS, { keyPath: "id" });
        events.createIndex("fileId", "fileId", { unique: false });
        events.createIndex("at", "at", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_THUMBS)) {
        db.createObjectStore(STORE_THUMBS, { keyPath: "fileId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return cached;
}

/** Reset the cached connection — tests and teardown only. */
export function closeWorkspaceDb(): void {
  void cached?.then((db) => db.close());
  cached = null;
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  const db = await openWorkspaceDb();
  const tx = db.transaction(store, mode);
  const result = run(tx.objectStore(store));
  const value = result instanceof Promise ? await result : await promisify(result);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  return value;
}

/* --------------------------------------------------------------- files */

export const getAllFiles = (): Promise<WorkspaceFile[]> =>
  withStore(STORE_FILES, "readonly", (s) => s.getAll() as IDBRequest<WorkspaceFile[]>);

export const putFile = (file: WorkspaceFile): Promise<IDBValidKey> =>
  withStore(STORE_FILES, "readwrite", (s) => s.put(file));

export const deleteFileRecord = (id: string): Promise<undefined> =>
  withStore(STORE_FILES, "readwrite", (s) => s.delete(id));

/** How many records reference a hash — a blob is deletable only at zero. */
export const countByHash = (hash: string): Promise<number> =>
  withStore(STORE_FILES, "readonly", (s) => s.index("hash").count(hash));

/* ------------------------------------------------- tags / collections */

export const getAllTags = (): Promise<WorkspaceTag[]> =>
  withStore(STORE_TAGS, "readonly", (s) => s.getAll() as IDBRequest<WorkspaceTag[]>);

export const putTag = (tag: WorkspaceTag): Promise<IDBValidKey> =>
  withStore(STORE_TAGS, "readwrite", (s) => s.put(tag));

export const deleteTag = (id: string): Promise<undefined> =>
  withStore(STORE_TAGS, "readwrite", (s) => s.delete(id));

export const getAllCollections = (): Promise<WorkspaceCollection[]> =>
  withStore(STORE_COLLECTIONS, "readonly", (s) => s.getAll() as IDBRequest<WorkspaceCollection[]>);

export const putCollection = (collection: WorkspaceCollection): Promise<IDBValidKey> =>
  withStore(STORE_COLLECTIONS, "readwrite", (s) => s.put(collection));

export const deleteCollection = (id: string): Promise<undefined> =>
  withStore(STORE_COLLECTIONS, "readwrite", (s) => s.delete(id));

/* --------------------------------------------------------------- events */

export const appendEvent = (event: WorkspaceEvent): Promise<IDBValidKey> =>
  withStore(STORE_EVENTS, "readwrite", (s) => s.put(event));

export const getAllEvents = (): Promise<WorkspaceEvent[]> =>
  withStore(STORE_EVENTS, "readonly", (s) => s.getAll() as IDBRequest<WorkspaceEvent[]>);

export const getEventsForFile = (fileId: string): Promise<WorkspaceEvent[]> =>
  withStore(
    STORE_EVENTS,
    "readonly",
    (s) => s.index("fileId").getAll(fileId) as IDBRequest<WorkspaceEvent[]>,
  );

/* --------------------------------------------------------------- thumbs */

export const putThumb = (thumb: ThumbRecord): Promise<IDBValidKey> =>
  withStore(STORE_THUMBS, "readwrite", (s) => s.put(thumb));

export const getThumb = (fileId: string): Promise<ThumbRecord | undefined> =>
  withStore(STORE_THUMBS, "readonly", (s) => s.get(fileId) as IDBRequest<ThumbRecord | undefined>);

export const getAllThumbs = (): Promise<ThumbRecord[]> =>
  withStore(STORE_THUMBS, "readonly", (s) => s.getAll() as IDBRequest<ThumbRecord[]>);

export const deleteThumb = (fileId: string): Promise<undefined> =>
  withStore(STORE_THUMBS, "readwrite", (s) => s.delete(fileId));
