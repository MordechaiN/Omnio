import { useQuery } from "@tanstack/react-query";
import { AnalyticsStatsSchema, type AnalyticsStats, type ToolEventInput } from "@omnio/contracts";
import { apiClient } from "./client";

type ToolTier = ToolEventInput["tier"];

/**
 * Whether this instance collects usage events at all, asked once per session.
 *
 * The event endpoint discards everything when the operator has not opted in, so
 * for a long time the client sent regardless and let the server drop it. That is
 * correct about *storage* and wrong about what a person can see: open the network
 * panel with analytics off, and Omnio is posting the name of every tool you
 * open — `pdfkit.pdf-redact` among them — to a server, while the Statistics page
 * says "Usage analytics are off".
 *
 * Omnio asks people to verify rather than to trust. Anything that punishes
 * someone for looking is a defect, however harmless the payload.
 */
let collecting: Promise<boolean> | null = null;

function instanceCollectsUsage(): Promise<boolean> {
  collecting ??= apiClient.analytics
    .stats()
    .then((res) => (res.status === 200 ? AnalyticsStatsSchema.parse(res.body).enabled : false))
    .catch(() => false);
  return collecting;
}

/**
 * Record that a tool ran — only if this instance actually collects usage.
 *
 * One question per session, and none at all after the answer is no. A failure
 * here is never surfaced to the person using the tool: usage counting must not
 * get in the way of the tool itself.
 */
export function recordToolEvent(toolId: string, tier: ToolTier = "browser"): void {
  void instanceCollectsUsage()
    .then((enabled) => {
      if (!enabled) return;
      return apiClient.analytics.record({
        body: { toolId, tier, durationBucket: "lt100ms", success: true },
      });
    })
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
