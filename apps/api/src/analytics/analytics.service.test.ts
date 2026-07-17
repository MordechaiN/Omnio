import type { ToolEventInput } from "@omnio/contracts";
import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../infra/prisma.service";
import type { SettingsService } from "../settings/settings.service";
import { AnalyticsService } from "./analytics.service";

const event: ToolEventInput = {
  toolId: "core.echo",
  tier: "worker",
  durationBucket: "lt1s",
  success: true,
};

function build(enabled: boolean) {
  const create = vi.fn().mockResolvedValue({});
  const prisma = { toolEvent: { create } } as unknown as PrismaService;
  const settings = {
    getInstanceBoolean: vi.fn().mockResolvedValue(enabled),
  } as unknown as SettingsService;
  return { service: new AnalyticsService(prisma, settings), create };
}

describe("AnalyticsService", () => {
  it("drops events when analytics is disabled", async () => {
    const { service, create } = build(false);
    await service.record(event);
    expect(create).not.toHaveBeenCalled();
  });

  it("records events when analytics is enabled", async () => {
    const { service, create } = build(true);
    await service.record(event);
    expect(create).toHaveBeenCalledOnce();
  });
});
