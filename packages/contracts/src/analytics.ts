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

/**
 * Anonymous, instance-wide aggregates — never per-user (decision D5; the
 * underlying table has no user linkage at all, so this can only ever describe
 * the platform, not a person). `enabled` lets the UI distinguish "off" from
 * "on with no data yet".
 */
export const ToolStatSchema = z.object({ toolId: z.string(), count: z.number().int() });
export const AnalyticsStatsSchema = z.object({
  enabled: z.boolean(),
  totalEvents: z.number().int(),
  byTool: z.array(ToolStatSchema),
  trending: z.array(ToolStatSchema),
});
export type AnalyticsStats = z.infer<typeof AnalyticsStatsSchema>;

export const analyticsContract = c.router(
  {
    record: {
      method: "POST",
      path: "/api/v1/analytics/events",
      body: ToolEventInputSchema,
      responses: { 204: z.void() },
      summary: "Record a tool-usage event (dropped unless analytics is enabled)",
    },
    stats: {
      method: "GET",
      path: "/api/v1/analytics/stats",
      responses: { 200: AnalyticsStatsSchema },
      summary: "Anonymous, instance-wide usage aggregates (all-time + last 7 days)",
    },
  },
  { strictStatusCodes: true },
);
