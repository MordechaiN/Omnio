"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { CATEGORY_IDS, type CategoryId } from "@omnio/core";
import { Badge, Icon, Skeleton } from "@omnio/ui";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { BarChart3, TrendingUp } from "lucide-react";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { SEARCH_ENTRIES } from "@/generated/registry.search";
import { useAnalyticsStats } from "@/lib/api/analytics";
import { buildInfo, versionLabel } from "@/lib/build-info";

const BY_ID = new Map(SEARCH_ENTRIES.map((entry) => [entry.id, entry]));

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border-subtle bg-surface p-4">
      <dt className="text-sm text-text-muted">{label}</dt>
      <dd dir="ltr" className="text-start text-2xl font-semibold tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function ToolRow({ toolId, count, max }: { toolId: string; count: number; max: number }) {
  const tRoot = useTranslations();
  const entry = BY_ID.get(toolId);
  const name = entry
    ? tRoot(`${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof tRoot>[0])
    : toolId;
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface p-3 transition-colors duration-(--motion-fast) hover:bg-surface-raised">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent-subtle-fg">
        <DynamicIcon name={(entry?.icon ?? "wrench") as IconName} size={18} />
      </span>
      <span className="w-32 shrink-0 truncate text-sm font-medium sm:w-44">{name}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-raised">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${max ? (count / max) * 100 : 0}%` }}
        />
      </div>
      <Badge variant="neutral" className="shrink-0">
        {count.toLocaleString()}
      </Badge>
    </li>
  );
}

/**
 * Platform statistics: describes Omnio itself, never a person. General facts
 * (tool/category count, version, build date) are static and always shown.
 * Usage and Popularity come from anonymous, instance-wide, opt-in aggregate
 * counters (decision D5) — off by default, so those sections show an honest
 * explanation instead of data until an operator turns analytics on.
 */
export function StatsView() {
  const t = useTranslations("stats");
  const tRoot = useTranslations();
  const { data, isPending, isError } = useAnalyticsStats();

  const byCategory = useMemo(() => {
    if (!data?.byTool.length) return [];
    const counts = new Map<CategoryId, number>();
    for (const { toolId, count } of data.byTool) {
      const category = BY_ID.get(toolId)?.category as CategoryId | undefined;
      if (!category) continue;
      counts.set(category, (counts.get(category) ?? 0) + count);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);
  const maxCategoryCount = byCategory[0]?.[1] ?? 0;
  const maxToolCount = data?.byTool[0]?.count ?? 0;
  const maxTrendingCount = data?.trending[0]?.count ?? 0;

  const averageExecutions = data?.byTool.length
    ? Math.round((data.totalEvents / data.byTool.length) * 10) / 10
    : 0;

  return (
    <div className="animate-rise-stagger flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text-secondary">{t("generalTitle")}</h2>
        <dl className="animate-rise-stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label={t("toolCount")} value={SEARCH_ENTRIES.length} />
          <StatTile label={t("categoryCount")} value={CATEGORY_IDS.length} />
          <StatTile label={t("version")} value={versionLabel} />
          <StatTile label={t("buildDate")} value={buildInfo.buildDate.slice(0, 10)} />
        </dl>
      </section>

      {isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : isError ? (
        <p className="text-sm text-text-muted">{t("error")}</p>
      ) : data && !data.enabled ? (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-6 text-center">
          <Icon icon={BarChart3} size={20} className="mx-auto text-text-muted" />
          <p className="text-sm font-medium">{t("analyticsOffTitle")}</p>
          <p className="mx-auto max-w-sm text-sm text-text-muted">{t("analyticsOffBody")}</p>
        </div>
      ) : data ? (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-text-secondary">{t("usageTitle")}</h2>
            <dl className="grid grid-cols-2 gap-3">
              <StatTile label={t("totalExecutions")} value={data.totalEvents.toLocaleString()} />
              <StatTile label={t("averageExecutions")} value={averageExecutions.toLocaleString()} />
            </dl>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-text-secondary">{t("mostUsedTools")}</h2>
            {data.byTool.length === 0 ? (
              <p className="text-sm text-text-muted">{t("noDataYet")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.byTool.slice(0, 6).map(({ toolId, count }) => (
                  <ToolRow key={toolId} toolId={toolId} count={count} max={maxToolCount} />
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text-secondary">
              <Icon icon={TrendingUp} size={16} />
              {t("trendingTools")}
            </h2>
            {data.trending.length === 0 ? (
              <p className="text-sm text-text-muted">{t("trendingEmpty")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.trending.slice(0, 6).map(({ toolId, count }) => (
                  <ToolRow key={toolId} toolId={toolId} count={count} max={maxTrendingCount} />
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-text-secondary">{t("mostUsedCategories")}</h2>
            {byCategory.length === 0 ? (
              <p className="text-sm text-text-muted">{t("noDataYet")}</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {byCategory.map(([category, count]) => (
                  <li key={category} className="flex items-center gap-3">
                    <Icon icon={CATEGORY_ICONS[category]} size={16} className="shrink-0 text-text-muted" />
                    <span className="w-28 shrink-0 truncate text-sm">
                      {tRoot(`categories.${category}.name`)}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-raised">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${maxCategoryCount ? (count / maxCategoryCount) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-end text-sm tabular-nums text-text-muted">
                      {count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
