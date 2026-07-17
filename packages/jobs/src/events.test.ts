import { describe, expect, it } from "vitest";
import { jobProgressChannel, ProgressEventSchema, TERMINAL_STATUSES } from "./events";

describe("job events", () => {
  it("namespaces the progress channel by job id", () => {
    expect(jobProgressChannel("abc")).toBe("omnio:job:abc");
  });

  it("validates a progress event", () => {
    const parsed = ProgressEventSchema.parse({ jobId: "j1", status: "active", progress: 40 });
    expect(parsed.progress).toBe(40);
  });

  it("rejects out-of-range progress", () => {
    expect(() =>
      ProgressEventSchema.parse({ jobId: "j1", status: "active", progress: 140 }),
    ).toThrow();
  });

  it("marks terminal statuses", () => {
    expect(TERMINAL_STATUSES.has("completed")).toBe(true);
    expect(TERMINAL_STATUSES.has("active")).toBe(false);
  });
});
