import { useSyncExternalStore } from "react";

/**
 * The temporary workspace — every file that passes through the universal drop
 * zone (and every output a chain produces) is remembered here for the current
 * browser session only. Pure memory: no storage, no upload, gone on reload.
 * Holding the File objects lets the user re-open anything without re-dragging.
 */
export interface SessionFile {
  id: string;
  file: File;
  /** "dropped" came from the user; "output" was produced by a tool chain. */
  origin: "dropped" | "output";
  at: number;
  /** Pinned files are never dropped by the MAX_FILES cap or "clear except pinned". */
  pinned: boolean;
}

const MAX_FILES = 20;

let files: SessionFile[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function recordSessionFile(file: File, origin: SessionFile["origin"]): void {
  const entry: SessionFile = {
    id: crypto.randomUUID().slice(0, 8),
    file,
    origin,
    at: Date.now(),
    pinned: false,
  };
  const next = [entry, ...files];
  // The cap never evicts a pinned file — trim from the unpinned tail instead.
  if (next.length > MAX_FILES) {
    let overflow = next.length - MAX_FILES;
    for (let i = next.length - 1; i >= 0 && overflow > 0; i -= 1) {
      if (!next[i]!.pinned) {
        next.splice(i, 1);
        overflow -= 1;
      }
    }
  }
  files = next;
  emit();
}

export function removeSessionFile(id: string): void {
  files = files.filter((entry) => entry.id !== id);
  emit();
}

export function removeSessionFiles(ids: readonly string[]): void {
  const set = new Set(ids);
  files = files.filter((entry) => !set.has(entry.id));
  emit();
}

export function togglePinned(id: string): void {
  files = files.map((entry) => (entry.id === id ? { ...entry, pinned: !entry.pinned } : entry));
  emit();
}

export function clearSession(): void {
  files = [];
  emit();
}

/** Remove every unpinned file, keeping pinned ones in place. */
export function clearExceptPinned(): void {
  files = files.filter((entry) => entry.pinned);
  emit();
}

/** Replace the session with a saved workspace's contents (newest first kept). */
export function restoreSession(entries: Array<{ file: File; origin: SessionFile["origin"] }>): void {
  const now = Date.now();
  files = entries.slice(0, MAX_FILES).map((entry, index) => ({
    id: crypto.randomUUID().slice(0, 8),
    file: entry.file,
    origin: entry.origin,
    at: now - index,
    pinned: false,
  }));
  emit();
}

/** Snapshot for saving. */
export function getSessionFiles(): SessionFile[] {
  return files;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: SessionFile[] = [];

export function useSessionFiles(): SessionFile[] {
  return useSyncExternalStore(
    subscribe,
    () => files,
    () => EMPTY,
  );
}
