import { Injectable } from "@nestjs/common";
import type { AnalyticsStats, ToolEventInput } from "@omnio/contracts";
import { PrismaService } from "../infra/prisma.service";
import { SettingsService } from "../settings/settings.service";

export const ANALYTICS_ENABLED_KEY = "analytics.enabled";
const TRENDING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Self-hosted, opt-in usage sink (decision D5). Events are dropped silently
 * unless the instance has explicitly enabled analytics, and only the anonymous
 * counter fields are ever persisted — no user linkage exists in the schema at
 * all, so these aggregates can only ever describe the platform, never a person.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async record(event: ToolEventInput): Promise<void> {
    if (!(await this.settings.getInstanceBoolean(ANALYTICS_ENABLED_KEY))) return;
    await this.prisma.toolEvent.create({
      data: {
        toolId: event.toolId,
        tier: event.tier,
        durationBucket: event.durationBucket,
        success: event.success,
      },
    });
  }

  async stats(): Promise<AnalyticsStats> {
    const enabled = await this.settings.getInstanceBoolean(ANALYTICS_ENABLED_KEY);
    if (!enabled) {
      return { enabled: false, totalEvents: 0, byTool: [], trending: [] };
    }

    const [byToolRows, trendingRows] = await Promise.all([
      this.prisma.toolEvent.groupBy({ by: ["toolId"], _count: { _all: true } }),
      this.prisma.toolEvent.groupBy({
        by: ["toolId"],
        _count: { _all: true },
        where: { createdAt: { gte: new Date(Date.now() - TRENDING_WINDOW_MS) } },
      }),
    ]);

    const byTool = byToolRows
      .map((r) => ({ toolId: r.toolId, count: r._count._all }))
      .sort((a, b) => b.count - a.count);
    const trending = trendingRows
      .map((r) => ({ toolId: r.toolId, count: r._count._all }))
      .sort((a, b) => b.count - a.count);

    return {
      enabled: true,
      totalEvents: byTool.reduce((sum, t) => sum + t.count, 0),
      byTool,
      trending,
    };
  }
}
