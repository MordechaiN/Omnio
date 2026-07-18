import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { hasLocale, useTranslations } from "next-intl";
import { use } from "react";
import { routing } from "@/i18n/routing";
import { CATEGORY_IDS, type CategoryId } from "@omnio/core";
import { Badge, Icon } from "@omnio/ui";
import { Link } from "@/i18n/navigation";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { SEARCH_ENTRIES } from "@/generated/registry.search";
import { PersonalSections } from "@/components/workspace/personal-sections";

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <HomeContent />;
}

function toolCountByCategory(): Map<CategoryId, number> {
  const counts = new Map<CategoryId, number>();
  for (const entry of SEARCH_ENTRIES) {
    const id = entry.category as CategoryId;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

function HomeContent() {
  const t = useTranslations("home");
  const tCategories = useTranslations("categories");
  const counts = toolCountByCategory();
  // Populated categories first — an empty one at the front of the grid is
  // the single most common dead-end click a new user can make.
  const orderedIds = [...CATEGORY_IDS].sort((a, b) => {
    const has = (id: CategoryId) => (counts.has(id) ? 0 : 1);
    return has(a) - has(b);
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-24 pt-8 sm:px-6 lg:pt-10">
      {/* Personal first — pinned and recent tools for returning users. Renders
          nothing until there's something to show, so a new install starts
          straight on Categories below, not an empty greeting. */}
      <PersonalSections />

      {/* Categories — the primary way to browse; search (⌘K, always one
          keystroke away) is the fast path once you know what you want. */}
      <section className="animate-rise flex flex-col gap-4" aria-labelledby="categories-title">
        <div className="flex items-baseline justify-between gap-4">
          <h1 id="categories-title" className="text-xl font-semibold tracking-tight">
            {t("categoriesTitle")}
          </h1>
          <p className="hidden text-sm text-text-muted sm:block">
            {t("toolCount", { count: SEARCH_ENTRIES.length })}
          </p>
        </div>
        <ul className="animate-rise-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {orderedIds.map((id) => {
            const isEmpty = !counts.has(id);
            return (
              <li key={id}>
                <Link
                  href={`/t/${id}`}
                  className="group flex h-full flex-col gap-3 rounded-xl border border-border-subtle bg-surface p-4 transition-[border-color,translate,box-shadow,background-color] duration-(--motion-base) ease-(--ease-out) hover:-translate-y-0.5 hover:border-border hover:bg-surface-raised hover:shadow-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`flex size-10 items-center justify-center rounded-lg transition-transform duration-(--motion-base) ease-(--ease-out) group-hover:scale-105 ${isEmpty ? "bg-bg text-text-muted" : "bg-accent-subtle text-accent-subtle-fg"}`}
                    >
                      <Icon icon={CATEGORY_ICONS[id]} size={20} />
                    </span>
                    {isEmpty ? (
                      <Badge variant="neutral" className="shrink-0">
                        {t("comingSoon")}
                      </Badge>
                    ) : (
                      <Badge variant="neutral" className="shrink-0">
                        {counts.get(id)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{tCategories(`${id}.name`)}</span>
                    <span className="line-clamp-2 text-sm text-text-muted">
                      {tCategories(`${id}.blurb`)}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
