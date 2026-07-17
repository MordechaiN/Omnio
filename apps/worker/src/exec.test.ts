import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createExec } from "./exec.ts";

describe("createExec", () => {
  it("runs an argv command and captures stdout as bytes", async () => {
    const exec = createExec(tmpdir());
    const result = await exec(process.execPath, ["-e", "process.stdout.write('hi')"]);
    expect(result.code).toBe(0);
    expect(Buffer.from(result.stdout).toString()).toBe("hi");
  });

  it("surfaces a non-zero exit code", async () => {
    const exec = createExec(tmpdir());
    const result = await exec(process.execPath, ["-e", "process.exit(3)"]);
    expect(result.code).toBe(3);
  });

  it("kills a process that exceeds its timeout", async () => {
    const exec = createExec(tmpdir());
    await expect(
      exec(process.execPath, ["-e", "setTimeout(() => {}, 10000)"], { timeoutSec: 1 }),
    ).rejects.toThrow(/timed out/);
  });
});
