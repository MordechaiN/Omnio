import { useSyncExternalStore } from "react";

/**
 * Persistent client preferences (favorites, tool usage) — localStorage with a
 * schema version so a shape change resets cleanly rather than crashing
 * (docs/architecture/04-frontend.md §4). A module singleton backs
 * useSyncExternalStore so every surface stays in sync without a provider.
 *
 * v2: recents grew from a plain id list into usage entries
 * ({ id, lastUsed, count }) so the dashboard can show "when" and "how often"
 * — still fully local, never sent anywhere.
 */
const STORAGE_KEY = "omnio.preferences.v1";
const SCHEMA_VERSION = 3;
/** How many tools we keep usage entries for (display slices are smaller). */
const MAX_TRACKED = 30;

export interface UsageEntry {
  id: string;
  /** Epoch ms of the most recent launch. */
  lastUsed: number;
  /** Total launches on this device. */
  count: number;
}

export interface Collection {
  id: string;
  name: string;
  /** Single emoji accent, chosen from a small preset list. */
  emoji: string;
  toolIds: string[];
}

export interface Workflow {
  id: string;
  name: string;
  emoji: string;
  /** Ordered tool ids — a guided sequence, stepped through one at a time. */
  steps: string[];
}

interface Preferences {
  v: number;
  favorites: string[];
  usage: UsageEntry[];
  collections: Collection[];
  workflows: Workflow[];
}

const DEFAULT: Preferences = {
  v: SCHEMA_VERSION,
  favorites: [],
  usage: [],
  collections: [],
  workflows: [],
};

let state: Preferences = DEFAULT;
let initialized = false;
const listeners = new Set<() => void>();

function isUsageEntry(value: unknown): value is UsageEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.lastUsed === "number" &&
    typeof entry.count === "number"
  );
}

function isCollection(value: unknown): value is Collection {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    typeof c.emoji === "string" &&
    Array.isArray(c.toolIds)
  );
}

function isWorkflow(value: unknown): value is Workflow {
  if (typeof value !== "object" || value === null) return false;
  const w = value as Record<string, unknown>;
  return (
    typeof w.id === "string" &&
    typeof w.name === "string" &&
    typeof w.emoji === "string" &&
    Array.isArray(w.steps)
  );
}

function read(): Preferences {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const favorites = Array.isArray(parsed.favorites)
      ? parsed.favorites.filter((f): f is string => typeof f === "string")
      : [];
    // v1 → old plain-id recents become usage entries; order carried over
    // as recency, counts start at 1 (we can't reconstruct history).
    let usage: UsageEntry[] = [];
    if (parsed.v === 1 && Array.isArray(parsed.recents)) {
      const now = Date.now();
      usage = (parsed.recents as unknown[])
        .filter((r): r is string => typeof r === "string")
        .map((id, index) => ({ id, lastUsed: now - index, count: 1 }));
    } else if (
      (parsed.v === 2 || parsed.v === SCHEMA_VERSION) &&
      Array.isArray(parsed.usage)
    ) {
      usage = parsed.usage.filter(isUsageEntry);
    } else {
      return DEFAULT;
    }
    // v2 → v3 simply adds the (empty) collections and workflows lists.
    const collections = Array.isArray(parsed.collections)
      ? parsed.collections.filter(isCollection)
      : [];
    const workflows = Array.isArray(parsed.workflows)
      ? parsed.workflows.filter(isWorkflow)
      : [];
    return { v: SCHEMA_VERSION, favorites, usage, collections, workflows };
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

/** Usage entries, most recent first. */
export function useRecentEntries(): UsageEntry[] {
  return usePreferences().usage;
}

/** Recent tool ids, most recent first (compat helper). */
export function useRecentTools(): string[] {
  return usePreferences().usage.map((entry) => entry.id);
}

/**
 * Tools launched more than once on this device, by launch count. A single
 * launch isn't a signal — callers hide the section when this is empty.
 */
export function usePopularTools(limit: number): UsageEntry[] {
  const usage = usePreferences().usage;
  return [...usage]
    .filter((entry) => entry.count > 1)
    .sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed)
    .slice(0, limit);
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
  const existing = state.usage.find((entry) => entry.id === id);
  const entry: UsageEntry = {
    id,
    lastUsed: Date.now(),
    count: (existing?.count ?? 0) + 1,
  };
  const usage = [entry, ...state.usage.filter((other) => other.id !== id)].slice(0, MAX_TRACKED);
  commit({ ...state, usage });
}

/* ------------------------------ Collections ------------------------------ */

export function useCollections(): Collection[] {
  return usePreferences().collections;
}

function newId(): string {
  return crypto.randomUUID().slice(0, 8);
}

export function createCollection(name: string, emoji: string): string {
  ensureInit();
  const id = newId();
  commit({
    ...state,
    collections: [...state.collections, { id, name, emoji, toolIds: [] }],
  });
  return id;
}

export function updateCollection(id: string, patch: Partial<Pick<Collection, "name" | "emoji">>): void {
  ensureInit();
  commit({
    ...state,
    collections: state.collections.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  });
}

export function deleteCollection(id: string): void {
  ensureInit();
  commit({ ...state, collections: state.collections.filter((c) => c.id !== id) });
}

export function toggleToolInCollection(collectionId: string, toolId: string): void {
  ensureInit();
  commit({
    ...state,
    collections: state.collections.map((c) => {
      if (c.id !== collectionId) return c;
      const toolIds = c.toolIds.includes(toolId)
        ? c.toolIds.filter((t) => t !== toolId)
        : [...c.toolIds, toolId];
      return { ...c, toolIds };
    }),
  });
}

/* ------------------------------- Workflows -------------------------------- */

export function useWorkflows(): Workflow[] {
  return usePreferences().workflows;
}

export function createWorkflow(name: string, emoji: string, steps: string[]): string {
  ensureInit();
  const id = newId();
  commit({ ...state, workflows: [...state.workflows, { id, name, emoji, steps }] });
  return id;
}

export function updateWorkflow(
  id: string,
  patch: Partial<Pick<Workflow, "name" | "emoji" | "steps">>,
): void {
  ensureInit();
  commit({
    ...state,
    workflows: state.workflows.map((w) => (w.id === id ? { ...w, ...patch } : w)),
  });
}

export function deleteWorkflow(id: string): void {
  ensureInit();
  commit({ ...state, workflows: state.workflows.filter((w) => w.id !== id) });
}
