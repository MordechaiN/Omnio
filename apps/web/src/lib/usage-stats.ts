import { useSyncExternalStore } from "react";

/**
 * Local, anonymous tool-usage counters — replaces the personal run-history
 * page (docs/architecture/07-roadmap.md, UX refinement). Privacy-first by
 * construction: everything lives in this browser's localStorage, keyed by
 * tool id and a count/last-used timestamp only. No file names, no job ids,
 * no server round trip — nothing here could identify what was processed.
 * Same schema-versioned-localStorage shape as `preferences.ts`.
 */
const STORAGE_KEY = "omnio.usage.v1";
const SCHEMA_VERSION = 1;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface UsageEntry {
  count: number;
  lastUsedAt: number;
}

interface UsageState {
  v: number;
  tools: Record<string, UsageEntry>;
}

const EMPTY: UsageState = { v: SCHEMA_VERSION, tools: {} };

let state: UsageState = EMPTY;
let initialized = false;
const listeners = new Set<() => void>();

function read(): UsageState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<UsageState>;
    if (parsed.v !== SCHEMA_VERSION || typeof parsed.tools !== "object" || !parsed.tools) {
      return EMPTY;
    }
    return { v: SCHEMA_VERSION, tools: parsed.tools };
  } catch {
    return EMPTY;
  }
}

function ensureInit(): void {
  if (initialized || typeof window === "undefined") return;
  state = read();
  initialized = true;
}

function commit(next: UsageState): void {
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

function getSnapshot(): UsageState {
  ensureInit();
  return state;
}

/** Record a tool run. Called once per visit to a tool page. */
export function recordToolUsage(id: string, now: number = Date.now()): void {
  ensureInit();
  const existing = state.tools[id];
  const entry: UsageEntry = { count: (existing?.count ?? 0) + 1, lastUsedAt: now };
  commit({ ...state, tools: { ...state.tools, [id]: entry } });
}

/** Wipe every stored count — the one required "undo" for this feature. */
export function clearUsageStats(): void {
  commit(EMPTY);
}

export function useUsageStats(): Record<string, UsageEntry> {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY).tools;
}

export interface UsageSummary {
  totalRuns: number;
  toolsUsed: number;
  /** Distinct tools touched in the last 7 days — the only "this week" figure
   * the schema can honestly report (per-run timestamps aren't kept). */
  toolsThisWeek: number;
  /** All tools ever used, most-run first — all-time counts. */
  popular: Array<{ id: string; count: number }>;
  /** Tools used within the last 7 days, most recently used first. */
  trending: Array<{ id: string; count: number; lastUsedAt: number }>;
}

/** Derive the display-ready aggregates from the raw per-tool counters. */
export function summarizeUsage(
  tools: Record<string, UsageEntry>,
  now: number = Date.now(),
): UsageSummary {
  const entries = Object.entries(tools);
  const totalRuns = entries.reduce((sum, [, e]) => sum + e.count, 0);
  const popular = entries
    .map(([id, e]) => ({ id, count: e.count }))
    .sort((a, b) => b.count - a.count);

  const weekCutoff = now - WEEK_MS;
  const recent = entries.filter(([, e]) => e.lastUsedAt >= weekCutoff);
  const trending = recent
    .map(([id, e]) => ({ id, count: e.count, lastUsedAt: e.lastUsedAt }))
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt);

  return {
    totalRuns,
    toolsUsed: entries.length,
    toolsThisWeek: recent.length,
    popular,
    trending,
  };
}
