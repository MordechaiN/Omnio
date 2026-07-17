/**
 * The typed contract for `ctx.exec()` — the ONLY subprocess path available to a
 * worker tool (docs/architecture/06-security.md §2). The worker provides the
 * implementation; it owns argv construction (no shell), timeouts, and output
 * caps. Module code cannot spawn processes any other way.
 */
export interface ExecOptions {
  /** Wall-clock limit; the process is killed on breach. */
  timeoutSec?: number;
  /** Cap on combined stdout+stderr bytes retained. */
  maxOutputBytes?: number;
  /** Working directory; defaults to the job scratch dir. */
  cwd?: string;
}

export interface ExecResult {
  code: number;
  /** Node's Buffer is assignable to Uint8Array; the SDK stays runtime-agnostic. */
  stdout: Uint8Array;
  stderr: Uint8Array;
}

/** argv-array only — never a shell string. */
export type Exec = (bin: string, args: string[], options?: ExecOptions) => Promise<ExecResult>;

export interface ToolLogger {
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}
