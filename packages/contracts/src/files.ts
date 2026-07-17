import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { ErrorSchema } from "./error.js";

const c = initContract();

export const StorageAreaSchema = z.enum(["scratch", "workspace"]);
export type StorageArea = z.infer<typeof StorageAreaSchema>;

export const FileObjectSchema = z.object({
  id: z.string(),
  area: StorageAreaSchema,
  mime: z.string(),
  size: z.number().int().nonnegative(),
  originalName: z.string(),
  createdAt: z.string().datetime(),
  ttlAt: z.string().datetime().nullable(),
});
export type FileObjectDto = z.infer<typeof FileObjectSchema>;

/**
 * File metadata operations. Binary transfer (upload/download) is streamed
 * through dedicated raw routes (`POST /api/v1/files`, `GET /api/v1/files/:id/content`),
 * which ts-rest's JSON model does not represent — see docs/architecture/06-security.md §3.
 */
export const filesContract = c.router(
  {
    list: {
      method: "GET",
      path: "/api/v1/files",
      query: z.object({ area: StorageAreaSchema.optional() }),
      responses: { 200: z.object({ files: z.array(FileObjectSchema) }) },
      summary: "List the caller's files",
    },
    get: {
      method: "GET",
      path: "/api/v1/files/:id",
      responses: { 200: FileObjectSchema, 404: ErrorSchema },
      summary: "File metadata",
    },
    keep: {
      method: "POST",
      path: "/api/v1/files/:id/keep",
      body: z.void(),
      responses: { 200: FileObjectSchema, 404: ErrorSchema },
      summary: "Move a scratch file into the retained workspace",
    },
    remove: {
      method: "DELETE",
      path: "/api/v1/files/:id",
      body: z.void(),
      responses: { 204: z.void(), 404: ErrorSchema },
      summary: "Delete a file and its stored bytes",
    },
  },
  { strictStatusCodes: true },
);
