import { execFile, type ExecFileException } from "node:child_process";
import type { Exec, ExecOptions, ExecResult } from "@omnio/module-sdk";

const DEFAULT_TIMEOUT_SEC = 60;
const DEFAULT_MAX_OUTPUT_BYTES = 64 * 1024 * 1024;

/**
 * The sandboxed subprocess wrapper — the only way a worker tool spawns a
 * process (docs/architecture/06-security.md §2). argv arrays only (no shell),
 * a scrubbed environment, cwd pinned to the job scratch dir, a hard timeout
 * (SIGKILL on breach), and a capped output buffer.
 */
export function createExec(scratchDir: string): Exec {
  return (bin: string, args: string[], options: ExecOptions = {}): Promise<ExecResult> =>
    new Promise<ExecResult>((resolve, reject) => {
      execFile(
        bin,
        args,
        {
          cwd: options.cwd ?? scratchDir,
          timeout: (options.timeoutSec ?? DEFAULT_TIMEOUT_SEC) * 1000,
          maxBuffer: options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES,
          killSignal: "SIGKILL",
          encoding: "buffer",
          // Scrubbed environment — only PATH survives.
          env: { PATH: process.env.PATH ?? "" },
        },
        (error: ExecFileException | null, stdout: Buffer, stderr: Buffer) => {
          if (error?.killed) {
            reject(new Error(`exec timed out: ${bin}`));
            return;
          }
          const code = typeof error?.code === "number" ? error.code : 0;
          resolve({ code, stdout, stderr });
        },
      );
    });
}
