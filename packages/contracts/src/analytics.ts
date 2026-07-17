import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

export const ToolTierSchema = z.enum(["browser", "server", "worker"]);

export const DurationBucketSchema = z.enum(["lt100ms", "lt1s", "lt5s", "lt30s", "gte30s"]);

/**
 * Opt-in usage counter (decision D5). The payload carries no file names, sizes,
 * or content — only which tool ran, its tier, a coarse duration bucket, and
 * whether it succeeded (docs/architecture/01-system-overview.md §5).
 */
export const ToolEventInputSchema = z.object({
  toolId: z.string().min(1).max(128),
  tier: ToolTierSchema,
  durationBucket: DurationBucketSchema,
  success: z.boolean(),
});
export type ToolEventInput = z.infer<typeof ToolEventInputSchema>;

export const analyticsContract = c.router(
  {
    record: {
      method: "POST",
      path: "/api/v1/analytics/events",
      body: ToolEventInputSchema,
      responses: { 204: z.void() },
      summary: "Record a tool-usage event (dropped unless analytics is enabled)",
    },
  },
  { strictStatusCodes: true },
);
