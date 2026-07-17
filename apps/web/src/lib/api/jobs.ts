import type { JobDto } from "@omnio/contracts";
import { API_BASE_URL, apiClient } from "./client";

interface CreateJobInput {
  moduleId: string;
  toolId: string;
  inputFileIds?: string[];
  options?: Record<string, unknown>;
}

/** Enqueue a worker/server-tier job and return its initial record. */
export async function createJob(input: CreateJobInput): Promise<JobDto> {
  const res = await apiClient.jobs.create({
    body: {
      moduleId: input.moduleId,
      toolId: input.toolId,
      inputFileIds: input.inputFileIds ?? [],
      options: input.options ?? {},
    },
  });
  if (res.status !== 201) {
    throw new Error(
      (res.body as { message?: string } | null)?.message ?? "Could not start the job.",
    );
  }
  return res.body;
}

/** SSE endpoint that streams live progress for a job. */
export function jobEventsUrl(id: string): string {
  return `${API_BASE_URL}/api/v1/jobs/${id}/events`;
}
