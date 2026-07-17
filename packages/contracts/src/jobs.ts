import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { ErrorSchema } from "./error.js";

const c = initContract();

export const JobStatusSchema = z.enum(["queued", "active", "completed", "failed", "canceled"]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const JobSchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  toolId: z.string(),
  status: JobStatusSchema,
  progress: z.number().int().min(0).max(100),
  error: z.string().nullable(),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  createdAt: z.string().datetime(),
  startedAt: z.string().datetime().nullable(),
  finishedAt: z.string().datetime().nullable(),
});
export type JobDto = z.infer<typeof JobSchema>;

export const CreateJobSchema = z.object({
  moduleId: z.string().min(1),
  toolId: z.string().min(1),
  inputFileIds: z.array(z.string()).default([]),
  options: z.record(z.unknown()).default({}),
});

/**
 * Worker-tier job creation and status. Live progress is delivered over SSE at
 * `GET /api/v1/jobs/:id/events` (a raw route — ts-rest models JSON only).
 */
export const jobsContract = c.router(
  {
    create: {
      method: "POST",
      path: "/api/v1/jobs",
      body: CreateJobSchema,
      responses: { 201: JobSchema, 400: ErrorSchema, 404: ErrorSchema },
      summary: "Enqueue a worker-tier job",
    },
    get: {
      method: "GET",
      path: "/api/v1/jobs/:id",
      responses: { 200: JobSchema, 404: ErrorSchema },
      summary: "Job status and result references",
    },
  },
  { strictStatusCodes: true },
);
