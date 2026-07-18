"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { CategoryId } from "@omnio/core";
import {
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Icon,
  toast,
} from "@omnio/ui";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { BarChart3, Trash2, TrendingUp } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { SEARCH_ENTRIES } from "@/generated/registry.search";
import { clearUsageStats, summarizeUsage, useUsageStats } from "@/lib/usage-stats";

const BY_ID = new Map(SEARCH_ENTRIES.map((entry) => [entry.id, entry]));

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4">
      <dt className="text-sm text-text-muted">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</dd>
    </div>
  );
}

function ToolRow({ id, count }: { id: string; count: number }) {
  const tRoot = useTranslations();
  const entry = BY_ID.get(id);
  const name = entry
    ? tRoot(`${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof tRoot>[0])
    : id;
  return (
    <li>
      <Link
        href={entry?.href ?? "/"}
        className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface p-3 transition-colors duration-(--motion-fast) hover:border-border hover:bg-surface-raised"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent-subtle-fg">
          <DynamicIcon name={(entry?.icon ?? "wrench") as IconName} size={18} />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
        <Badge variant="neutral">{count.toLocaleString()}</Badge>
      </Link>
    </li>
  );
}

/** Usage statistics: tool + category counts, trending, popular — aggregated
 * on this device only. Replaces the personal run-history page. */
export function StatsView() {
  const t = useTranslations("stats");
  const tRoot = useTranslations();
  const tools = useUsageStats();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const summary = useMemo(() => summarizeUsage(tools), [tools]);

  const byCategory = useMemo(() => {
    const counts = new Map<CategoryId, number>();
    for (const { id, count } of summary.popular) {
      const category = BY_ID.get(id)?.category as CategoryId | undefined;
      if (!category) continue;
      counts.set(category, (counts.get(category) ?? 0) + count);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [summary.popular]);

  const maxCategoryCount = byCategory[0]?.[1] ?? 0;

  function handleClear(): void {
    clearUsageStats();
    setConfirmOpen(false);
    toast.success(t("clearedToast"));
  }

  if (summary.toolsUsed === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title={t("emptyTitle")}
        description={t("emptyBody")}
        action={
          <Button asChild>
            <Link href="/">{t("emptyAction")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label={t("totalRuns")} value={summary.totalRuns} />
        <StatTile label={t("toolsUsed")} value={summary.toolsUsed} />
        <StatTile label={t("thisWeek")} value={summary.toolsThisWeek} />
      </dl>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text-secondary">{t("popularTitle")}</h2>
        {summary.popular.length === 0 ? (
          <p className="text-sm text-text-muted">{t("popularEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {summary.popular.slice(0, 6).map(({ id, count }) => (
              <ToolRow key={id} id={id} count={count} />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text-secondary">
          <Icon icon={TrendingUp} size={16} />
          {t("trendingTitle")}
        </h2>
        {summary.trending.length === 0 ? (
          <p className="text-sm text-text-muted">{t("trendingEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {summary.trending.slice(0, 6).map(({ id, count }) => (
              <ToolRow key={id} id={id} count={count} />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text-secondary">{t("byCategoryTitle")}</h2>
        {byCategory.length === 0 ? (
          <p className="text-sm text-text-muted">{t("byCategoryEmpty")}</p>
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

      <div className="flex justify-start border-t border-border-subtle pt-6">
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(true)}>
            <Icon icon={Trash2} size={16} />
            {t("clearButton")}
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("clearConfirmTitle")}</DialogTitle>
              <DialogDescription>{t("clearConfirmBody")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">{tRoot("common.cancel")}</Button>
              </DialogClose>
              <Button variant="danger" onClick={handleClear}>
                {t("clearConfirmAction")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
