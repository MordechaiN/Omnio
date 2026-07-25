import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { Badge } from "@omnio/ui";
import { Link } from "@/i18n/navigation";
import { CATEGORY_EMOJI } from "@/lib/category-emoji";
import { ACTIVE_CATEGORY_IDS, TOOL_COUNT_BY_CATEGORY } from "@/lib/categories";
import { SEARCH_ENTRIES } from "@/generated/registry.search";
import { DropHero } from "@/components/workspace/drop-hero";
import { PersonalSections } from "@/components/workspace/personal-sections";
import { SessionStrip } from "@/components/workspace/session-strip";
import { WorkspacesSection } from "@/components/workspace/workspaces-section";
import { ContinueWorking } from "@/components/files/continue-working";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tCategories = await getTranslations("categories");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pb-24 pt-8 sm:px-6 lg:pt-12">
      {/* The hero — Omnio's permanent identity and single entry point. Drop,
          paste, or click; the File Intelligence flow takes over from there. */}
      <DropHero />

      {/* 🗃️ This session's files, then 💾 saved workspaces and ⭐ favorites /
          recents — all local, and each renders nothing until it has content, so
          a first-time visitor sees only the hero and the category grid. */}
      {/* What you were last working on leads — it is why people come back. */}
      <ContinueWorking />

      <SessionStrip />
      <WorkspacesSection />
      <PersonalSections />

      {/* 📂 Categories — the browsing surface; search (⌘K) is the fast path. */}
      <section className="animate-rise flex flex-col gap-4" aria-labelledby="categories-title">
        <div className="flex items-baseline justify-between gap-4">
          <h2
            id="categories-title"
            className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-text-secondary uppercase"
          >
            <span aria-hidden="true" className="text-base leading-none normal-case">
              📂
            </span>
            {t("categoriesTitle")}
          </h2>
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
