"use client";

import { advanceRun, workspace, type Chain, type ChainRun } from "@omnio/workspace";

/**
 * Runs a chain by carrying each tool's output into the next step.
 *
 * The handoff is the whole point. Omnio already announces every file a tool
 * produces (`omnio:workspace-produce`), and already hands files to tools through
 * the pending-file channel. A chain sits between the two: when a step produces
 * a file, the runner catches it and opens the next tool with that file already
 * loaded. The user never saves to their downloads folder and re-drops anything.
 *
 * The run lives in sessionStorage rather than memory because a step is a real
 * navigation, and a run that evaporated on a refresh mid-chain would be worse
 * than no run at all. It is session-scoped on purpose: a half-finished chain is
 * not something to greet someone with tomorrow.
 */

const KEY = "omnio.chain.run";

/**
 * Cached snapshot. useSyncExternalStore compares by identity, so parsing the
 * stored JSON on every call would hand React a new object each render and send
 * it into a loop. The cache is keyed on the raw string, so it stays correct
 * even when another tab writes the value.
 */
let cachedRaw: string | null = null;
let cachedRun: ChainRun | null = null;

export function getRun(): ChainRun | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw === cachedRaw) return cachedRun;
    cachedRaw = raw;
    cachedRun = raw ? (JSON.parse(raw) as ChainRun) : null;
    return cachedRun;
  } catch {
    return null;
  }
}

function setRun(run: ChainRun | null): void {
  try {
    if (run) sessionStorage.setItem(KEY, JSON.stringify(run));
    else sessionStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the chain simply will not survive a reload.
  }
  window.dispatchEvent(new CustomEvent("omnio:chain-changed"));
}

export function beginRun(chain: Chain, fileId: string, steps?: string[]): ChainRun {
  const run: ChainRun = {
    chainId: chain.id,
    name: chain.name,
    steps: steps ?? chain.steps,
    position: 0,
    fileId,
    startedAt: Date.now(),
  };
  setRun(run);
  return run;
}

export function cancelRun(): void {
  setRun(null);
}

/**
 * Record that the current step produced a file and move to the next one.
 * Returns the next step's tool id, or null when the chain is finished.
 */
export function completeStep(producedFileId: string): string | null {
  const run = getRun();
  if (!run) return null;
  const next = advanceRun(run, producedFileId);
  setRun(next);
  return next ? next.steps[next.position] ?? null : null;
}

/** Hand the current step's file to the tool about to open. */
export async function fileForCurrentStep(): Promise<File | null> {
  const run = getRun();
  if (!run) return null;
  return workspace.openFile(run.fileId);
}

export function subscribeToRun(listener: () => void): () => void {
  window.addEventListener("omnio:chain-changed", listener);
  return () => window.removeEventListener("omnio:chain-changed", listener);
}
