import { Injectable } from "@nestjs/common";
import type { ToolEventInput } from "@omnio/contracts";
import { PrismaService } from "../infra/prisma.service";
import { SettingsService } from "../settings/settings.service";

export const ANALYTICS_ENABLED_KEY = "analytics.enabled";

/**
 * Self-hosted, opt-in usage sink (decision D5). Events are dropped silently
 * unless the instance has explicitly enabled analytics, and only the anonymous
 * counter fields are ever persisted.
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
}
