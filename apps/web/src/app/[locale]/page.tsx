import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { hasLocale, useTranslations } from "next-intl";
import { use } from "react";
import { routing } from "@/i18n/routing";
import { Badge } from "@omnio/ui";
import { Link } from "@/i18n/navigation";
import { CATEGORY_EMOJI } from "@/lib/category-emoji";
import { ACTIVE_CATEGORY_IDS, TOOL_COUNT_BY_CATEGORY } from "@/lib/categories";
import { SEARCH_ENTRIES } from "@/generated/registry.search";
import { PersonalSections } from "@/components/workspace/personal-sections";

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations("home");
  const tCategories = useTranslations("categories");

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
          <div className="flex flex-col gap-0.5">
            <h1 id="categories-title" className="text-xl font-semibold tracking-tight">
              {t("categoriesTitle")}
            </h1>
            <p className="text-sm text-text-muted">{t("tagline")}</p>
          </div>
          <p className="hidden shrink-0 text-sm text-text-muted sm:block">
            {t("toolCount", { count: SEARCH_ENTRIES.length })}
          </p>
        </div>
        <ul className="animate-rise-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {ACTIVE_CATEGORY_IDS.map((id) => (
            <li key={id}>
              <Link
                href={`/t/${id}`}
                className="group flex h-full flex-col gap-3 rounded-xl border border-border-subtle bg-surface p-4 transition-[border-color,translate,box-shadow,background-color] duration-(--motion-base) ease-(--ease-out) hover:-translate-y-0.5 hover:border-border hover:bg-surface-raised hover:shadow-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    aria-hidden="true"
                    className="flex size-10 items-center justify-center rounded-lg bg-accent-subtle text-xl leading-none transition-transform duration-(--motion-base) ease-(--ease-out) group-hover:scale-105"
                  >
                    {CATEGORY_EMOJI[id]}
                  </span>
                  <Badge variant="neutral" className="shrink-0">
                    {TOOL_COUNT_BY_CATEGORY.get(id)}
                  </Badge>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{tCategories(`${id}.name`)}</span>
                  <span className="line-clamp-2 text-sm text-text-muted">
                    {tCategories(`${id}.blurb`)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
