"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { CategoryId } from "@omnio/core";
import { Badge } from "@omnio/ui";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { Link } from "@/i18n/navigation";
import { SEARCH_ENTRIES, type SearchEntry } from "@/generated/registry.search";
import {
  useFavorites,
  usePopularTools,
  useRecentEntries,
  type UsageEntry,
} from "@/lib/preferences";
import { formatRelativeTime } from "@/lib/relative-time";
import { ToolGrid } from "./tool-grid";

const BY_ID = new Map(SEARCH_ENTRIES.map((entry) => [entry.id, entry]));

function resolve(ids: string[]): SearchEntry[] {
  return ids
    .map((id) => BY_ID.get(id))
    .filter((entry): entry is SearchEntry => entry !== undefined);
}

function SectionHeading({ id, emoji, children }: { id: string; emoji: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-text-secondary uppercase"
    >
      <span aria-hidden="true" className="text-base leading-none normal-case">
        {emoji}
      </span>
      {children}
    </h2>
  );
}

/**
 * A recent/popular tool as a compact row: icon, name, category, when it was
 * last used (and how often, for popular). The whole row reopens the tool.
 */
function UsageRow({ entry, usage, showCount }: { entry: SearchEntry; usage: UsageEntry; showCount?: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const name = t(`${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof t>[0]);
  return (
    <li>
      <Link
        href={entry.href}
        className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface px-3 py-2.5 transition-[border-color,background-color] duration-(--motion-fast) ease-(--ease-out) hover:border-border hover:bg-surface-raised"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent-subtle-fg">
          <DynamicIcon name={entry.icon as IconName} size={16} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="truncate text-xs text-text-muted">
            {t(`categories.${entry.category as CategoryId}.name`)}
            {" · "}
            {formatRelativeTime(locale, usage.lastUsed)}
          </span>
        </span>
        {showCount ? (
          <Badge variant="neutral" className="shrink-0 tabular-nums">
            ×{usage.count}
          </Badge>
        ) : null}
      </Link>
    </li>
  );
}

/**
 * The personal half of the dashboard — favorites, recent, and frequently used
 * tools, all from local-only preferences. A brand-new visitor instead gets one
 * quiet hint that favoriting exists; nothing renders on the server, so there
 * is no hydration flash.
 */
export function PersonalSections() {
  const t = useTranslations("home");
  const favorites = resolve(useFavorites());
  const recents = useRecentEntries();
  const popular = usePopularTools(4);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  if (favorites.length === 0 && recents.length === 0) {
    return (
      <p className="animate-rise flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-text-muted">
        <span aria-hidden="true">⭐</span>
        {t("favoritesHint")}
      </p>
    );
  }

  const recentRows = recents
    .map((usage) => ({ usage, entry: BY_ID.get(usage.id) }))
    .filter((row): row is { usage: UsageEntry; entry: SearchEntry } => row.entry !== undefined)
    .slice(0, 4);
  const popularRows = popular
    .map((usage) => ({ usage, entry: BY_ID.get(usage.id) }))
    .filter((row): row is { usage: UsageEntry; entry: SearchEntry } => row.entry !== undefined);

  return (
    <div className="animate-rise flex flex-col gap-8">
      {favorites.length > 0 ? (
        <section className="flex flex-col gap-3" aria-labelledby="favorites-title">
          <SectionHeading id="favorites-title" emoji="⭐">
            {t("favoritesTitle")}
          </SectionHeading>
          <ToolGrid entries={favorites} />
        </section>
      ) : null}

      {(recentRows.length > 0 || popularRows.length > 0) ? (
        <div className="grid gap-8 lg:grid-cols-2">
          {recentRows.length > 0 ? (
            <section className="flex flex-col gap-3" aria-labelledby="recent-title">
              <SectionHeading id="recent-title" emoji="🕘">
                {t("recentTitle")}
              </SectionHeading>
              <ul className="flex flex-col gap-2">
                {recentRows.map(({ usage, entry }) => (
                  <UsageRow key={usage.id} entry={entry} usage={usage} />
                ))}
              </ul>
            </section>
          ) : null}

          {popularRows.length > 0 ? (
            <section className="flex flex-col gap-3" aria-labelledby="popular-title">
              <SectionHeading id="popular-title" emoji="🔥">
                {t("popularTitle")}
              </SectionHeading>
              <ul className="flex flex-col gap-2">
                {popularRows.map(({ usage, entry }) => (
                  <UsageRow key={usage.id} entry={entry} usage={usage} showCount />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
