import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { hasLocale, useTranslations } from "next-intl";
import { use } from "react";
import { CATEGORY_IDS, isCategoryId, type CategoryId } from "@omnio/core";
import { EmptyState, Icon } from "@omnio/ui";
import { routing } from "@/i18n/routing";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { SEARCH_ENTRIES } from "@/generated/registry.search";
import { ToolGrid } from "@/components/workspace/tool-grid";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    CATEGORY_IDS.map((category) => ({ locale, category })),
  );
}

export default function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category } = use(params);
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  if (!isCategoryId(category)) notFound();
  return <CategoryContent category={category} />;
}

function CategoryContent({ category }: { category: CategoryId }) {
  const t = useTranslations();
  const entries = SEARCH_ENTRIES.filter((entry) => entry.category === category);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-10">
      <header className="animate-rise flex items-center gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent-subtle-fg">
          <Icon icon={CATEGORY_ICONS[category]} size={24} />
        </span>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-semibold tracking-tight">
            {t(`categories.${category}.name`)}
          </h1>
          <p className="text-sm text-text-muted">{t(`categories.${category}.blurb`)}</p>
        </div>
      </header>

      {entries.length === 0 ? (
        <EmptyState
          icon={CATEGORY_ICONS[category]}
          title={t("categoryPage.emptyTitle")}
          description={t("categoryPage.emptyBody")}
        />
      ) : (
        <ToolGrid entries={entries} />
      )}
    </div>
  );
}
