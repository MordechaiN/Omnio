import { useSyncExternalStore } from "react";

/**
 * Saved workspaces — the session, made durable. IndexedDB (raw, no library)
 * stores each workspace's files as Blobs alongside its name and timestamps,
 * entirely on this device. Opening a workspace pours its files back into the
 * live session strip.
 */
export interface SavedWorkspaceMeta {
  id: string;
  name: string;
  updatedAt: number;
  fileCount: number;
  totalSize: number;
}

interface StoredFile {
  name: string;
  type: string;
  blob: Blob;
  origin: "dropped" | "output";
}

interface StoredWorkspace extends SavedWorkspaceMeta {
  files: StoredFile[];
}

const DB_NAME = "omnio.workspaces";
const STORE = "workspaces";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

/* In-memory metadata mirror so React can subscribe synchronously. */
let metas: SavedWorkspaceMeta[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

async function refresh(): Promise<void> {
  try {
    const all = await tx<StoredWorkspace[]>("readonly", (store) => store.getAll() as IDBRequest<StoredWorkspace[]>);
    metas = all
      .map(({ id, name, updatedAt, fileCount, totalSize }) => ({ id, name, updatedAt, fileCount, totalSize }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    metas = [];
  }
  loaded = true;
  emit();
}

export function useSavedWorkspaces(): SavedWorkspaceMeta[] {
  if (typeof window !== "undefined" && !loaded) {
    loaded = true;
    void refresh();
  }
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => metas,
    () => [],
  );
}

export async function saveWorkspace(
  name: string,
  files: Array<{ file: File; origin: "dropped" | "output" }>,
): Promise<void> {
  const stored: StoredWorkspace = {
    id: crypto.randomUUID().slice(0, 8),
    name,
    updatedAt: Date.now(),
    fileCount: files.length,
    totalSize: files.reduce((sum, entry) => sum + entry.file.size, 0),
    files: files.map(({ file, origin }) => ({ name: file.name, type: file.type, blob: file, origin })),
  };
  await tx("readwrite", (store) => store.put(stored));
  await refresh();
}

export async function loadWorkspaceFiles(
  id: string,
): Promise<Array<{ file: File; origin: "dropped" | "output" }> | null> {
  const stored = await tx<StoredWorkspace | undefined>("readonly", (store) => store.get(id) as IDBRequest<StoredWorkspace | undefined>);
  if (!stored) return null;
  return stored.files.map((entry) => ({
    file: new File([entry.blob], entry.name, { type: entry.type }),
    origin: entry.origin,
  }));
}

export async function renameWorkspace(id: string, name: string): Promise<void> {
  const stored = await tx<StoredWorkspace | undefined>("readonly", (store) => store.get(id) as IDBRequest<StoredWorkspace | undefined>);
  if (!stored) return;
  await tx("readwrite", (store) => store.put({ ...stored, name, updatedAt: Date.now() }));
  await refresh();
}

export async function duplicateWorkspace(id: string, copySuffix: string): Promise<void> {
  const stored = await tx<StoredWorkspace | undefined>("readonly", (store) => store.get(id) as IDBRequest<StoredWorkspace | undefined>);
  if (!stored) return;
  await tx("readwrite", (store) =>
    store.put({
      ...stored,
      id: crypto.randomUUID().slice(0, 8),
      name: `${stored.name} ${copySuffix}`,
      updatedAt: Date.now(),
    }),
  );
  await refresh();
}

export async function deleteWorkspace(id: string): Promise<void> {
  await tx("readwrite", (store) => store.delete(id));
  await refresh();
}
