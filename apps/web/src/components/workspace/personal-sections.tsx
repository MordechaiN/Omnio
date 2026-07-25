"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { Link } from "@/i18n/navigation";
import { SEARCH_ENTRIES, type SearchEntry } from "@/generated/registry.search";
import {
  useFavorites,
  usePopularTools,
  useRecentEntries,
  type UsageEntry,
} from "@/lib/preferences";
import { ToolGrid } from "./tool-grid";

const BY_ID = new Map(SEARCH_ENTRIES.map((entry) => [entry.id, entry]));

function resolve(ids: string[]): SearchEntry[] {
  return ids
    .map((id) => BY_ID.get(id))
    .filter((entry): entry is SearchEntry => entry !== undefined);
}

/**
 * One heading style for the whole of Home.
 *
 * Uppercase headings with an emoji each are a website convention: they shout for
 * attention in a place that should feel like a desktop, and Home was running two
 * heading systems at once. Quiet sentence case, everywhere.
 */
function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-sm font-semibold">
      {children}
    </h2>
  );
}

/**
 * A frequently-used tool as a compact card.
 *
 * The vertical list this replaces read like a settings screen: full-width rows,
 * a category, a timestamp and a count on every line. What the section actually
 * needs to say is "these are the tools you reach for", and that is a shape you
 * scan rather than read — so it is now a row of small cards with the icon
 * leading, the name under it, and the count as a quiet footnote.
 */
function UsageCard({ entry, usage }: { entry: SearchEntry; usage: UsageEntry }) {
  const t = useTranslations();
  const name = t(`${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof t>[0]);
  return (
    <li>
      <Link
        href={entry.href}
        className="group flex h-full w-full flex-col items-center gap-2 rounded-xl border border-border-subtle bg-surface px-3 py-4 text-center transition-[border-color,background-color,transform] duration-(--motion-fast) ease-(--ease-out) hover:border-border hover:bg-surface-raised motion-safe:hover:-translate-y-0.5"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent-subtle-fg">
          <DynamicIcon name={entry.icon as IconName} size={19} />
        </span>
        <span className="line-clamp-2 text-sm font-medium leading-tight">{name}</span>
        <span className="text-xs tabular-nums text-text-muted">
          {t("home.timesUsed", { count: usage.count })}
        </span>
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
  const popular = usePopularTools(6);
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
          <SectionHeading id="favorites-title">
            {t("favoritesTitle")}
          </SectionHeading>
          <ToolGrid entries={favorites} />
        </section>
      ) : null}

      {(recentRows.length > 0 || popularRows.length > 0) ? (
        <div className="grid gap-8 lg:grid-cols-2">
          {recentRows.length > 0 ? (
            <section className="flex flex-col gap-3" aria-labelledby="recent-title">
              <SectionHeading id="recent-title">
                {t("recentTitle")}
              </SectionHeading>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {recentRows.map(({ usage, entry }) => (
                  <UsageCard key={usage.id} entry={entry} usage={usage} />
                ))}
              </ul>
            </section>
          ) : null}

          {popularRows.length > 0 ? (
            <section className="flex flex-col gap-3" aria-labelledby="popular-title">
              <SectionHeading id="popular-title">
                {t("popularTitle")}
              </SectionHeading>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {popularRows.map(({ usage, entry }) => (
                  <UsageCard key={usage.id} entry={entry} usage={usage} />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
