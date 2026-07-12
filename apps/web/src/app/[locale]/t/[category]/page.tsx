import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { hasLocale, useTranslations } from "next-intl";
import { use } from "react";
import { CATEGORY_IDS, isCategoryId, type CategoryId } from "@omnio/core";
import { Badge, EmptyState, Icon } from "@omnio/ui";
import { routing } from "@/i18n/routing";
import { CATEGORY_ICONS } from "@/lib/category-icons";

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

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex items-center gap-4">
        <span className="flex size-11 items-center justify-center rounded-lg bg-accent-subtle text-accent-subtle-fg">
          <Icon icon={CATEGORY_ICONS[category]} size={24} />
        </span>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t(`categories.${category}.name`)}
          </h1>
          <p className="text-text-muted">{t(`categories.${category}.blurb`)}</p>
        </div>
      </header>

      {/* Tools populate this grid from the module registry in M4/M7. */}
      <EmptyState
        icon={CATEGORY_ICONS[category]}
        title={t("common.comingSoon")}
        description={t("home.roadmapM7")}
        action={<Badge variant="accent">{t("home.statusBadge", { milestone: "M2" })}</Badge>}
      />
    </div>
  );
}
