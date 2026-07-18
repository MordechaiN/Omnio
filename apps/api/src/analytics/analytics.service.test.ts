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

function build(enabled: boolean, groupByResults: unknown[] = []) {
  const create = vi.fn().mockResolvedValue({});
  const groupBy = vi.fn().mockResolvedValue(groupByResults);
  const prisma = { toolEvent: { create, groupBy } } as unknown as PrismaService;
  const settings = {
    getInstanceBoolean: vi.fn().mockResolvedValue(enabled),
  } as unknown as SettingsService;
  return { service: new AnalyticsService(prisma, settings), create, groupBy };
}

describe("AnalyticsService.record", () => {
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

describe("AnalyticsService.stats", () => {
  it("returns an honest disabled state — no query, no fabricated numbers", async () => {
    const { service, groupBy } = build(false);
    const stats = await service.stats();
    expect(stats).toEqual({ enabled: false, totalEvents: 0, byTool: [], trending: [] });
    expect(groupBy).not.toHaveBeenCalled();
  });

  it("aggregates and sorts by-tool and trending counts when enabled", async () => {
    const { service } = build(true, [
      { toolId: "case.uppercase", _count: { _all: 3 } },
      { toolId: "jsonkit.json-format", _count: { _all: 7 } },
    ]);
    const stats = await service.stats();
    expect(stats.enabled).toBe(true);
    expect(stats.totalEvents).toBe(10);
    expect(stats.byTool[0]).toEqual({ toolId: "jsonkit.json-format", count: 7 });
    expect(stats.byTool[1]).toEqual({ toolId: "case.uppercase", count: 3 });
  });

  it("never returns a per-user or per-run field — only toolId and count", async () => {
    const { service } = build(true, [{ toolId: "case.uppercase", _count: { _all: 1 } }]);
    const stats = await service.stats();
    for (const row of [...stats.byTool, ...stats.trending]) {
      expect(Object.keys(row).sort()).toEqual(["count", "toolId"]);
    }
  });
});
