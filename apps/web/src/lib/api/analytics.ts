import { useQuery } from "@tanstack/react-query";
import type { AnalyticsStats, ToolEventInput } from "@omnio/contracts";
import { apiClient } from "./client";

type ToolTier = ToolEventInput["tier"];

/**
 * Record that a tool ran. Fire-and-forget: the api silently drops the event
 * unless the instance operator has opted in to analytics (decision D5), so
 * this never needs to check a flag first, and a failure here is never
 * surfaced to the person using the tool — usage counting must not get in the
 * way of the tool itself.
 */
export function recordToolEvent(toolId: string, tier: ToolTier = "browser"): void {
  void apiClient.analytics
    .record({ body: { toolId, tier, durationBucket: "lt100ms", success: true } })
    .catch(() => {
      // Analytics is best-effort; a logged-out session or offline api is fine.
    });
}

/** Anonymous, instance-wide usage aggregates — the Statistics page's data source. */
export function useAnalyticsStats() {
  return useQuery<AnalyticsStats>({
    queryKey: ["analytics", "stats"],
    queryFn: async () => {
      const res = await apiClient.analytics.stats();
      if (res.status !== 200) throw new Error("Could not load usage statistics.");
      return res.body;
    },
    staleTime: 60_000,
  });
}
