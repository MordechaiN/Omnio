import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { hasLocale, useTranslations } from "next-intl";
import { use } from "react";
import { routing } from "@/i18n/routing";
import { CATEGORY_IDS } from "@omnio/core";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Icon,
} from "@omnio/ui";
import { Eye, Github, HeartHandshake, Server, ShieldCheck, Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { SearchButton } from "@/components/shell/search-button";

const FEATURES = [
  { key: "Privacy", icon: ShieldCheck },
  { key: "SelfHosted", icon: Server },
  { key: "Viewer", icon: Eye },
  { key: "Open", icon: HeartHandshake },
  { key: "Fast", icon: Zap },
] as const;

const ROADMAP = [
  { key: "roadmapM1", status: "done" },
  { key: "roadmapM2", status: "current" },
  { key: "roadmapM3", status: "next" },
  { key: "roadmapM4", status: "next" },
  { key: "roadmapM7", status: "next" },
] as const;

const FAQ_ITEMS = ["1", "2", "3", "4"] as const;

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations("home");
  const tCommon = useTranslations("common");
  const tCategories = useTranslations("categories");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-20 px-4 pb-24 pt-16 sm:px-6">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 text-center">
        <p className="text-sm font-medium tracking-wide text-accent">{t("heroEyebrow")}</p>
        <h1 className="max-w-2xl text-display font-semibold tracking-tight text-balance">
          {t("heroTitle")}
        </h1>
        <p className="max-w-xl text-lg text-text-secondary text-pretty">{t("heroSubtitle")}</p>
        <div className="mt-2 w-full max-w-xl" aria-label={t("heroSearchLabel")}>
          <SearchButton size="hero" />
        </div>
        <Badge variant="accent">{t("statusBadge", { milestone: "M2" })}</Badge>
      </section>

      {/* Categories */}
      <section className="flex flex-col gap-6" aria-labelledby="categories-title">
        <div className="flex flex-col gap-1.5">
          <h2 id="categories-title" className="text-2xl font-semibold tracking-tight">
            {t("categoriesTitle")}
          </h2>
          <p className="text-text-muted">{t("categoriesSubtitle")}</p>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORY_IDS.map((id) => (
            <li key={id}>
              <Link
                href={`/t/${id}`}
                className="group flex h-full flex-col gap-2.5 rounded-lg border border-border-subtle bg-surface p-4 shadow-1 transition-[border-color,translate,box-shadow] duration-(--motion-base) ease-(--ease-out) hover:-translate-y-0.5 hover:border-border hover:shadow-2"
              >
                <span className="flex size-9 items-center justify-center rounded-md bg-accent-subtle text-accent-subtle-fg">
                  <Icon icon={CATEGORY_ICONS[id]} size={20} />
                </span>
                <span className="font-medium">{tCategories(`${id}.name`)}</span>
                <span className="text-sm text-text-muted">{tCategories(`${id}.blurb`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Why Omnio */}
      <section className="flex flex-col gap-6" aria-labelledby="why-title">
        <h2 id="why-title" className="text-2xl font-semibold tracking-tight">
          {t("whyTitle")}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ key, icon }) => (
            <li
              key={key}
              className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-surface p-5"
            >
              <Icon icon={icon} size={20} className="text-accent" />
              <h3 className="font-medium">{t(`why${key}Title`)}</h3>
              <p className="text-sm text-text-muted">{t(`why${key}Body`)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Roadmap */}
      <section className="flex flex-col gap-6" aria-labelledby="roadmap-title">
        <div className="flex flex-col gap-1.5">
          <h2 id="roadmap-title" className="text-2xl font-semibold tracking-tight">
            {t("roadmapTitle")}
          </h2>
          <p className="text-text-muted">{t("roadmapSubtitle")}</p>
        </div>
        <ol className="flex flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface">
          {ROADMAP.map(({ key, status }) => (
            <li
              key={key}
              className="flex items-center justify-between gap-4 border-b border-border-subtle px-5 py-3.5 last:border-b-0"
            >
              <span className="text-sm">{t(key)}</span>
              <Badge
                variant={
                  status === "done" ? "success" : status === "current" ? "accent" : "neutral"
                }
              >
                {status === "done"
                  ? t("roadmapDone")
                  : status === "current"
                    ? t("roadmapCurrent")
                    : t("roadmapNext")}
              </Badge>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ */}
      <section className="flex flex-col gap-4" aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-2xl font-semibold tracking-tight">
          {t("faqTitle")}
        </h2>
        <Accordion
          type="single"
          collapsible
          className="rounded-lg border border-border-subtle bg-surface px-5"
        >
          {FAQ_ITEMS.map((n) => (
            <AccordionItem key={n} value={n}>
              <AccordionTrigger>{t(`faqQ${n}`)}</AccordionTrigger>
              <AccordionContent>{t(`faqA${n}`)}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Footer */}
      <footer className="flex flex-col items-center gap-3 border-t border-border-subtle pt-8 text-sm text-text-muted">
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/MordechaiN/Omnio"
            className="flex items-center gap-1.5 transition-colors duration-(--motion-fast) hover:text-text"
          >
            <Icon icon={Github} size={16} />
            {t("footerGitHub")}
          </a>
          <a
            href="https://github.com/MordechaiN/Omnio/tree/main/docs/architecture"
            className="transition-colors duration-(--motion-fast) hover:text-text"
          >
            {t("footerDocs")}
          </a>
        </div>
        <p>
          {tCommon("appName")} · {t("footerLicense")}
        </p>
      </footer>
    </div>
  );
}
