import type { Exec, ToolLogger } from "./exec";

/**
 * Progress + cancellation are first-class in every tier, so the UI behaves
 * identically for a 10 ms browser tool and a 5-minute transcode
 * (docs/architecture/03-module-system.md §3).
 */
export type ProgressReporter = (percent: number) => void;

// ─── browser tier ───────────────────────────────────────────────────────────

export interface BrowserToolContext {
  /** Files the user attached (drop flow hands these in directly). */
  readonly files: readonly File[];
  readonly signal: AbortSignal;
  readonly onProgress: ProgressReporter;
}

/** A pure function of its inputs, executed client-side. */
export interface BrowserTool<In, Out> {
  run(input: In, ctx: BrowserToolContext): Promise<Out>;
}

// ─── server tier ────────────────────────────────────────────────────────────

export interface ServerToolContext {
  readonly signal: AbortSignal;
  readonly logger: ToolLogger;
}

/** Synchronous API-side tool (budget < 2 s / < 20 MB). */
export interface ServerTool<In, Out> {
  handle(input: In, ctx: ServerToolContext): Promise<Out>;
}

// ─── worker tier ────────────────────────────────────────────────────────────

export interface ToolInput {
  /** Absolute path inside the job scratch dir. */
  readonly path: string;
  readonly mime: string;
  readonly originalName: string;
}

export interface ToolOutput {
  /** Absolute path inside the job scratch dir the worker will persist. */
  readonly path: string;
  readonly mime: string;
  readonly filename: string;
}

export interface ToolJob<Opts> {
  readonly id: string;
  readonly options: Opts;
  readonly inputs: readonly ToolInput[];
}

export interface ToolResult {
  readonly outputs: ToolOutput[];
}

export interface WorkerContext {
  /** Per-job scratch directory (0700, deleted after the job). */
  readonly scratchDir: string;
  /** The only subprocess path (argv arrays, sandboxed). */
  readonly exec: Exec;
  readonly onProgress: ProgressReporter;
  readonly logger: ToolLogger;
  readonly signal: AbortSignal;
}

/** Runs inside the sandbox, filesystem-scoped to the job dir. */
export interface WorkerTool<Opts> {
  process(job: ToolJob<Opts>, ctx: WorkerContext): Promise<ToolResult>;
}
