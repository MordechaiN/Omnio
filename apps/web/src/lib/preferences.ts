import { useSyncExternalStore } from "react";

/**
 * Persistent client preferences (favorites, recent tools) — localStorage with a
 * schema version so a shape change resets cleanly rather than crashing
 * (docs/architecture/04-frontend.md §4). A module singleton backs
 * useSyncExternalStore so every surface stays in sync without a provider.
 */
const STORAGE_KEY = "omnio.preferences.v1";
const SCHEMA_VERSION = 1;
const MAX_RECENTS = 8;

interface Preferences {
  v: number;
  favorites: string[];
  recents: string[];
}

const DEFAULT: Preferences = { v: SCHEMA_VERSION, favorites: [], recents: [] };

let state: Preferences = DEFAULT;
let initialized = false;
const listeners = new Set<() => void>();

function read(): Preferences {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    if (
      parsed.v !== SCHEMA_VERSION ||
      !Array.isArray(parsed.favorites) ||
      !Array.isArray(parsed.recents)
    ) {
      return DEFAULT;
    }
    return { v: SCHEMA_VERSION, favorites: parsed.favorites, recents: parsed.recents };
  } catch {
    return DEFAULT;
  }
}

function ensureInit(): void {
  if (initialized || typeof window === "undefined") return;
  state = read();
  initialized = true;
}

function commit(next: Preferences): void {
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

function getSnapshot(): Preferences {
  ensureInit();
  return state;
}

function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT);
}

export function useFavorites(): string[] {
  return usePreferences().favorites;
}

export function useRecentTools(): string[] {
  return usePreferences().recents;
}

export function useIsFavorite(id: string): boolean {
  return usePreferences().favorites.includes(id);
}

export function toggleFavorite(id: string): void {
  ensureInit();
  const favorites = state.favorites.includes(id)
    ? state.favorites.filter((favorite) => favorite !== id)
    : [...state.favorites, id];
  commit({ ...state, favorites });
}

export function recordRecentTool(id: string): void {
  ensureInit();
  const recents = [id, ...state.recents.filter((recent) => recent !== id)].slice(0, MAX_RECENTS);
  commit({ ...state, recents });
}
