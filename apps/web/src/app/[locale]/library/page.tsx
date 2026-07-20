import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { CollectionsSection } from "@/components/workspace/collections-section";
import { WorkflowsSection } from "@/components/workspace/workflows-section";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * 📚 Library — the home for the things a user builds up over time: their own
 * tool Collections and saved Workflows. Moved off the dashboard in M15 so the
 * homepage can stay a clean entry point; the sidebar links here.
 */
export default async function LibraryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("library");

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-8 sm:px-6 lg:py-10">
      <header className="animate-rise flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <span aria-hidden="true">📚</span>
          {t("title")}
        </h1>
        <p className="max-w-2xl text-text-muted">{t("subtitle")}</p>
      </header>

      <CollectionsSection />
      <WorkflowsSection />
    </div>
  );
}
