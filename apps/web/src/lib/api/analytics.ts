import { useQuery } from "@tanstack/react-query";
import { AnalyticsStatsSchema, type AnalyticsStats, type ToolEventInput } from "@omnio/contracts";
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
      // The client does not validate response bodies, and this is a self-hosted
      // product: an api one version behind the web app can answer 200 with a
      // different shape. Parsing here turns that into the page's existing error
      // state instead of a crash that replaces the whole screen — reading
      // `body.byTool.length` off an unexpected shape took the Statistics page
      // down entirely, which is a poor way to learn your api is out of date.
      return AnalyticsStatsSchema.parse(res.body);
    },
    staleTime: 60_000,
  });
}
