import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { hasLocale, useTranslations } from "next-intl";
import { use } from "react";
import { routing } from "@/i18n/routing";
import { HistoryView } from "@/components/history/history-view";

export default function HistoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <HistoryContent />;
}

function HistoryContent() {
  const t = useTranslations("history");
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-text-muted">{t("subtitle")}</p>
      </div>
      <HistoryView />
    </div>
  );
}
