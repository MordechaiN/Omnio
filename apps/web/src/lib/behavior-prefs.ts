import { useSyncExternalStore } from "react";

/**
 * Behavior preferences — small on/off switches for how the app itself acts,
 * as opposed to how it looks (that's the theme/style/accent/density axes in
 * @omnio/ui). Same schema-versioned localStorage shape as preferences.ts.
 */
const STORAGE_KEY = "omnio.behavior.v1";
const SCHEMA_VERSION = 1;

interface BehaviorPrefs {
  v: number;
  /** Auto-open the Activity tray when a worker-tier job is started. */
  autoOpenActivity: boolean;
}

const DEFAULT: BehaviorPrefs = { v: SCHEMA_VERSION, autoOpenActivity: true };

let state: BehaviorPrefs = DEFAULT;
let initialized = false;
const listeners = new Set<() => void>();

function read(): BehaviorPrefs {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<BehaviorPrefs>;
    if (parsed.v !== SCHEMA_VERSION || typeof parsed.autoOpenActivity !== "boolean") {
      return DEFAULT;
    }
    return { v: SCHEMA_VERSION, autoOpenActivity: parsed.autoOpenActivity };
  } catch {
    return DEFAULT;
  }
}

function ensureInit(): void {
  if (initialized || typeof window === "undefined") return;
  state = read();
  initialized = true;
}

function commit(next: BehaviorPrefs): void {
  state = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage full or unavailable — keep the in-memory state
    }
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  ensureInit();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): BehaviorPrefs {
  ensureInit();
  return state;
}

/** Plain, non-hook read — for callbacks outside React render (e.g. runJob). */
export function getAutoOpenActivity(): boolean {
  ensureInit();
  return state.autoOpenActivity;
}

export function setAutoOpenActivity(value: boolean): void {
  ensureInit();
  commit({ ...state, autoOpenActivity: value });
}

export function useAutoOpenActivity(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT).autoOpenActivity;
}
