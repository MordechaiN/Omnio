import { z } from "zod";

/**
 * Tool options as a Zod schema — the single definition validates the frontend
 * form and (for server/worker tools) the executor (docs/architecture/03-module-system.md §3).
 */
export const uuidOptionsSchema = z.object({
  version: z.enum(["v4", "v7"]).default("v4"),
  count: z.number().int().min(1).max(100).default(5),
});

export type UuidOptions = z.infer<typeof uuidOptionsSchema>;
export type UuidVersion = UuidOptions["version"];
