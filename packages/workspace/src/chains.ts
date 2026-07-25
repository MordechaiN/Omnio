/**
 * Chains — repeatable sequences of tools, learned from work already done.
 *
 * The workspace already records, for every produced file, which tool made it
 * and which file it came from. That provenance *is* a recipe: if a scan was
 * OCR'd, then compressed, then password-protected, the workspace knows that
 * sequence without anyone having described it. Chains read that graph back out.
 *
 * This is deliberately not a workflow builder. Asking someone to assemble a
 * pipeline before they have a problem is the reason most automation features go
 * unused; the sequence they already performed is better evidence of what they
 * want than anything they would have configured up front.
 *
 * Pure functions only — no storage, no React, no tool execution.
 */

import type { WorkspaceFile } from "./model.ts";

/** A named, re-runnable sequence of tool ids. */
export interface Chain {
  id: string;
  name: string;
  /** Ordered tool ids, applied one after another. */
  steps: string[];
  createdAt: number;
  /** True when Omnio derived this from observed work rather than being told. */
  learned: boolean;
  /** Mime types this chain has been applied to, for offering it on similar files. */
  appliesTo: string[];
}

/** A sequence observed in the workspace, with how often it happened. */
export interface ChainCandidate {
  steps: string[];
  /** How many separate files were produced by exactly this sequence. */
  occurrences: number;
  /** The mime type of the file each run started from. */
  sourceMimes: string[];
}

/**
 * The ordered tool ids that produced `file`, oldest step first.
 *
 * Walks the derivation backwards to the original import. Cycles cannot occur
 * through normal use but are guarded anyway — a hung Inspector is a worse bug
 * than a truncated chain.
 */
export function stepsThatProduced(file: WorkspaceFile, files: WorkspaceFile[]): string[] {
  const byId = new Map(files.map((f) => [f.id, f]));
  const steps: string[] = [];
  const seen = new Set<string>();
  let current: WorkspaceFile | undefined = file;
  while (current?.derivedFrom && !seen.has(current.id)) {
    seen.add(current.id);
    steps.unshift(current.derivedFrom.toolId);
    current = byId.get(current.derivedFrom.fileId);
  }
  return steps;
}

/** The file at the root of a derivation — the one actually imported. */
export function originOf(file: WorkspaceFile, files: WorkspaceFile[]): WorkspaceFile {
  const byId = new Map(files.map((f) => [f.id, f]));
  const seen = new Set<string>();
  let current = file;
  while (current.derivedFrom && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = byId.get(current.derivedFrom.fileId);
    if (!parent) break;
    current = parent;
  }
  return current;
}

/**
 * Find sequences worth offering back to the user.
 *
 * Only *leaf* files are considered — a file that something else was derived
 * from represents an intermediate state, not a finished result, and offering to
 * stop halfway would be worse than offering nothing. Single-step sequences are
 * excluded because "run one tool" is not a chain; that is just the tool.
 */
export function learnChains(files: WorkspaceFile[], minOccurrences = 1): ChainCandidate[] {
  const hasChildren = new Set(
    files.flatMap((f) => (f.derivedFrom ? [f.derivedFrom.fileId] : [])),
  );

  const bySequence = new Map<string, ChainCandidate>();
  for (const file of files) {
    if (hasChildren.has(file.id)) continue;
    const steps = stepsThatProduced(file, files);
    if (steps.length < 2) continue;
    const key = steps.join("→");
    const existing = bySequence.get(key);
    const sourceMime = originOf(file, files).mime;
    if (existing) {
      existing.occurrences += 1;
      if (!existing.sourceMimes.includes(sourceMime)) existing.sourceMimes.push(sourceMime);
    } else {
      bySequence.set(key, { steps, occurrences: 1, sourceMimes: [sourceMime] });
    }
  }

  return [...bySequence.values()]
    .filter((candidate) => candidate.occurrences >= minOccurrences)
    .sort((a, b) => b.occurrences - a.occurrences || b.steps.length - a.steps.length);
}

/**
 * Chains worth offering for a file, best first.
 *
 * A chain is offered when it has been used on this kind of file before, and the
 * work already done to this file is a prefix of it — including the empty prefix,
 * which is simply an untouched file. Chains whose remaining steps are empty are
 * dropped: there is nothing left to run.
 */
export function chainsFor(
  file: WorkspaceFile,
  files: WorkspaceFile[],
  chains: Chain[],
): Array<{ chain: Chain; remaining: string[] }> {
  const done = stepsThatProduced(file, files);
  const origin = originOf(file, files);

  return chains
    .flatMap((chain) => {
      if (chain.appliesTo.length > 0 && !chain.appliesTo.includes(origin.mime)) return [];
      if (!isPrefix(done, chain.steps)) return [];
      const remaining = chain.steps.slice(done.length);
      return remaining.length > 0 ? [{ chain, remaining }] : [];
    })
    .sort((a, b) => a.remaining.length - b.remaining.length);
}

/** True when `prefix` matches the start of `steps`. An empty prefix always does. */
export function isPrefix(prefix: string[], steps: string[]): boolean {
  if (prefix.length > steps.length) return false;
  return prefix.every((step, i) => steps[i] === step);
}

/** Progress through a chain run. */
export interface ChainRun {
  chainId: string;
  name: string;
  steps: string[];
  /** Index of the step about to run. */
  position: number;
  /** The workspace file the next step will receive. */
  fileId: string;
  startedAt: number;
}

export function advanceRun(run: ChainRun, producedFileId: string): ChainRun | null {
  const position = run.position + 1;
  if (position >= run.steps.length) return null;
  return { ...run, position, fileId: producedFileId };
}

export function runProgress(run: ChainRun): { current: number; total: number; done: boolean } {
  return {
    current: Math.min(run.position + 1, run.steps.length),
    total: run.steps.length,
    done: run.position >= run.steps.length,
  };
}

/**
 * A readable default name for a learned chain, e.g. "OCR → Compress".
 * `label` resolves a tool id to its display name; unresolvable ids fall back to
 * the id so a name is never empty.
 */
export function defaultChainName(steps: string[], label: (toolId: string) => string): string {
  return steps.map((step) => label(step) || step).join(" → ");
}
