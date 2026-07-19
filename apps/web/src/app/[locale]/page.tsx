import { readFileSync } from "node:fs";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { Badge } from "@omnio/ui";
import { Link } from "@/i18n/navigation";
import { CATEGORY_EMOJI } from "@/lib/category-emoji";
import { ACTIVE_CATEGORY_IDS, TOOL_COUNT_BY_CATEGORY } from "@/lib/categories";
import { parseChangelog, type Release } from "@/lib/changelog";
import { SEARCH_ENTRIES } from "@/generated/registry.search";
import { PersonalSections } from "@/components/workspace/personal-sections";
import { SessionStrip } from "@/components/workspace/session-strip";
import { CollectionsSection } from "@/components/workspace/collections-section";
import { WorkflowsSection } from "@/components/workspace/workflows-section";

/** Latest changelog entries for the What's New card — read at build time. */
function loadLatestRelease(): Release | null {
  const candidates = [
    join(process.cwd(), "CHANGELOG.md"),
    join(process.cwd(), "..", "..", "CHANGELOG.md"),
  ];
  for (const path of candidates) {
    try {
      const releases = parseChangelog(readFileSync(path, "utf8"));
      return releases.find((release) => release.sections.length > 0) ?? null;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

/** Strip the inline Markdown we write (**bold**, `code`) down to plain text. */
function plainify(item: string): string {
  return item.replace(/\*\*/g, "").replace(/`/g, "");
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tCategories = await getTranslations("categories");
  const latest = loadLatestRelease();
  const highlights = latest?.sections[0]?.items.slice(0, 3).map(plainify) ?? [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-24 pt-8 sm:px-6 lg:pt-10">
      {/* 👋 Welcome — who Omnio is, in one breath. */}
      <header className="animate-rise flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <span aria-hidden="true">👋</span>
          {t("welcomeTitle")}
        </h1>
        <p className="max-w-2xl text-text-muted">
          {t("welcomeBody", { count: SEARCH_ENTRIES.length })}
        </p>
      </header>

      {/* ⭐ Favorites, 🕘 Recent, 🔥 Popular — local-only, renders a single
          onboarding hint for a brand-new visitor. */}
      {/* 🗃️ This session's files — memory only, gone on reload. */}
      <SessionStrip />

      <PersonalSections />

      {/* 🗂️ Collections + ⚡ Workflows — the user's own structure, local-only. */}
      <div className="animate-rise flex flex-col gap-10">
        <CollectionsSection />
        <WorkflowsSection />
      </div>

      {/* 🆕 What's new — pulled straight from the changelog at build time. */}
      {highlights.length > 0 ? (
        <section className="animate-rise flex flex-col gap-3" aria-labelledby="whats-new-title">
          <h2
            id="whats-new-title"
            className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-text-secondary uppercase"
          >
            <span aria-hidden="true" className="text-base leading-none normal-case">
              🆕
            </span>
            {t("whatsNewTitle")}
          </h2>
          <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface p-4">
            <ul className="flex list-disc flex-col gap-1.5 ps-5 text-sm text-text-secondary">
              {highlights.map((item, index) => (
                <li key={index} className="line-clamp-2">
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/changelog"
              className="self-start text-sm font-medium text-accent transition-colors hover:text-accent-hover"
            >
              {t("whatsNewMore")}
            </Link>
          </div>
        </section>
      ) : null}

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
