import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { hasLocale, useTranslations } from "next-intl";
import { use } from "react";
import type { CategoryId } from "@omnio/core";
import { Badge } from "@omnio/ui";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { routing } from "@/i18n/routing";
import { WEB_MODULES } from "@/generated/registry.web";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * 🧩 Modules — the foundation for the future ecosystem. Today every module is
 * built-in; the page is laid out so community modules can slot in later
 * without a redesign (status column, version, per-module cards).
 */
export default function ModulesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <ModulesContent />;
}

function ModulesContent() {
  const t = useTranslations();
  const modules = [...WEB_MODULES].sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-10">
      <header className="animate-rise flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <span aria-hidden="true">🧩</span>
          {t("modules.title")}
        </h1>
        <p className="max-w-2xl text-text-muted">{t("modules.subtitle")}</p>
      </header>

      <section className="animate-rise flex flex-col gap-3" aria-labelledby="modules-builtin">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="modules-builtin" className="text-sm font-semibold tracking-wide text-text-secondary uppercase">
            {t("modules.builtinTitle")}
          </h2>
          <p className="text-sm text-text-muted">
            {t("modules.count", { count: modules.length })}
          </p>
        </div>
        <ul className="animate-rise-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <li
              key={module.id}
              className="flex flex-col gap-2.5 rounded-xl border border-border-subtle bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex size-9 items-center justify-center rounded-lg bg-accent-subtle text-accent-subtle-fg">
                  <DynamicIcon name={module.icon as IconName} size={18} />
                </span>
                <Badge variant="neutral">
                  <span dir="ltr">v{module.version}</span>
                </Badge>
              </div>
              <div className="flex flex-col gap-0.5">
                <h3 className="font-medium">
                  {t(`${module.i18nNamespace}.name` as Parameters<typeof t>[0])}
                </h3>
                <p className="line-clamp-2 text-sm text-text-muted">
                  {t(`${module.i18nNamespace}.description` as Parameters<typeof t>[0])}
                </p>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="accent">{t("modules.statusActive")}</Badge>
                <Badge variant="neutral">
                  {t(`categories.${module.category as CategoryId}.name`)}
                </Badge>
                <Badge variant="neutral">
                  {t("modules.toolCount", { count: module.toolCount })}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="modules-community"
        className="animate-rise flex flex-col gap-2 rounded-xl border border-dashed border-border p-6 text-center"
      >
        <p aria-hidden="true" className="text-2xl leading-none">
          🌱
        </p>
        <h2 id="modules-community" className="text-sm font-semibold">
          {t("modules.communityTitle")}
        </h2>
        <p className="mx-auto max-w-md text-sm text-text-muted">{t("modules.communityBody")}</p>
      </section>
    </div>
  );
}
