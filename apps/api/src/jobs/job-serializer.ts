import type { JobDto } from "@omnio/contracts";
import type { FileObject, Job } from "@omnio/db";

export type JobWithRefs = Job & { inputs: FileObject[]; outputs: FileObject[] };

export function toJobDto(job: JobWithRefs): JobDto {
  return {
    id: job.id,
    moduleId: job.moduleId,
    toolId: job.toolId,
    status: job.status,
    progress: job.progress,
    error: job.error,
    inputs: job.inputs.map((file) => file.id),
    outputs: job.outputs.map((file) => file.id),
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt ? job.startedAt.toISOString() : null,
    finishedAt: job.finishedAt ? job.finishedAt.toISOString() : null,
  };
}
