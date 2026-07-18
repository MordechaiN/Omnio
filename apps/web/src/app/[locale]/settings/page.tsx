import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { hasLocale, useTranslations } from "next-intl";
import { use } from "react";
import { routing } from "@/i18n/routing";
import { SettingsPanel } from "@/components/settings/settings-panel";

export default function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <SettingsContent />;
}

function SettingsContent() {
  const t = useTranslations("nav");
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-10">
      <h1 className="animate-rise text-2xl font-semibold tracking-tight">{t("settings")}</h1>
      <SettingsPanel />
    </div>
  );
}
