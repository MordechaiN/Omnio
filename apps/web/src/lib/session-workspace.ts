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
  };
  files = [entry, ...files].slice(0, MAX_FILES);
  emit();
}

export function removeSessionFile(id: string): void {
  files = files.filter((entry) => entry.id !== id);
  emit();
}

export function clearSession(): void {
  files = [];
  emit();
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
