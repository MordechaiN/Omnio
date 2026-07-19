"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SEARCH_ENTRIES, type SearchEntry } from "@/generated/registry.search";
import { useFavorites, useRecentTools } from "@/lib/preferences";
import { ToolGrid } from "./tool-grid";

const BY_ID = new Map(SEARCH_ENTRIES.map((entry) => [entry.id, entry]));

function resolve(ids: string[]): SearchEntry[] {
  return ids
    .map((id) => BY_ID.get(id))
    .filter((entry): entry is SearchEntry => entry !== undefined);
}

/**
 * The personal top of the workspace — a returning user sees their pinned and
 * recently used tools first. A brand-new visitor instead gets one quiet hint
 * that favoriting exists (the star is hover-revealed, so otherwise invisible);
 * nothing renders on the server, so there is no hydration flash.
 */
export function PersonalSections() {
  const t = useTranslations("home");
  const favorites = resolve(useFavorites());
  const recents = resolve(useRecentTools());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (favorites.length === 0 && recents.length === 0) {
    if (!mounted) return null;
    return (
      <p className="animate-rise flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-text-muted">
        <span aria-hidden="true">⭐</span>
        {t("favoritesHint")}
      </p>
    );
  }

  return (
    <div className="animate-rise flex flex-col gap-8">
      {favorites.length > 0 ? (
        <section className="flex flex-col gap-3" aria-labelledby="favorites-title">
          <h2
            id="favorites-title"
            className="text-sm font-semibold tracking-wide text-text-secondary uppercase"
          >
            {t("favoritesTitle")}
          </h2>
          <ToolGrid entries={favorites} />
        </section>
      ) : null}

      {recents.length > 0 ? (
        <section className="flex flex-col gap-3" aria-labelledby="recent-title">
          <h2
            id="recent-title"
            className="text-sm font-semibold tracking-wide text-text-secondary uppercase"
          >
            {t("recentTitle")}
          </h2>
          <ToolGrid entries={recents} />
        </section>
      ) : null}
    </div>
  );
}
