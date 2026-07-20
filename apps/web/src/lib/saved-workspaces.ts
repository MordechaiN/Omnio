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

/* ------------------------- Portable ZIP round-trip ------------------------- */

interface WorkspaceManifest {
  kind: "omnio-workspace";
  version: 1;
  name: string;
  files: Array<{ path: string; name: string; type: string; origin: "dropped" | "output" }>;
}

/** Download a workspace as a portable ZIP (manifest + files). */
export async function exportWorkspaceZip(id: string): Promise<boolean> {
  const stored = await tx<StoredWorkspace | undefined>("readonly", (store) => store.get(id) as IDBRequest<StoredWorkspace | undefined>);
  if (!stored) return false;
  const { zip } = await import("fflate");
  const manifest: WorkspaceManifest = {
    kind: "omnio-workspace",
    version: 1,
    name: stored.name,
    files: stored.files.map((file, index) => ({
      path: `files/${index}`,
      name: file.name,
      type: file.type,
      origin: file.origin,
    })),
  };
  const payload: Record<string, Uint8Array> = {
    "manifest.json": new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
  };
  for (const [index, file] of stored.files.entries()) {
    payload[`files/${index}`] = new Uint8Array(await file.blob.arrayBuffer());
  }
  const bytes = await new Promise<Uint8Array>((resolve, reject) =>
    zip(payload, { level: 6 }, (error, data) => (error ? reject(error) : resolve(data))),
  );
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/zip" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${stored.name.replace(/[^\w.-]+/g, "-") || "workspace"}.omnio.zip`;
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}

/** Import a workspace ZIP produced by exportWorkspaceZip. */
export async function importWorkspaceZip(file: File): Promise<boolean> {
  try {
    const { unzip } = await import("fflate");
    const data = new Uint8Array(await file.arrayBuffer());
    const entries = await new Promise<Record<string, Uint8Array>>((resolve, reject) =>
      unzip(data, (error, result) => (error ? reject(error) : resolve(result))),
    );
    const manifestBytes = entries["manifest.json"];
    if (!manifestBytes) return false;
    const manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as Partial<WorkspaceManifest>;
    if (manifest.kind !== "omnio-workspace" || manifest.version !== 1 || !Array.isArray(manifest.files)) {
      return false;
    }
    const files = manifest.files.flatMap((entry) => {
      const bytes = entries[entry.path];
      if (!bytes) return [];
      return [
        {
          file: new File([bytes as BlobPart], entry.name, { type: entry.type }),
          origin: entry.origin === "output" ? ("output" as const) : ("dropped" as const),
        },
      ];
    });
    await saveWorkspace(manifest.name ?? "Imported", files);
    return true;
  } catch {
    return false;
  }
}
