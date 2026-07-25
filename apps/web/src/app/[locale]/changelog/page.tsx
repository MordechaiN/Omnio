import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { loadReleases } from "@/lib/releases";

// Release notes are read at build time and baked into the static page, in the
// reader's language only. The runtime never touches the source files.
export const dynamic = "force-static";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function ChangelogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("changelog");
  const releases = loadReleases(locale);

  const sectionNames: Record<string, string> = {
    new: t("sections.new"),
    improved: t("sections.improved"),
    fixed: t("sections.fixed"),
    known: t("sections.known"),
  };
  const localizedLabel = (type: string): string => sectionNames[type] ?? type;

  // Recognition at a glance when scanning releases. Decorative only.
  const sectionEmoji: Record<string, string> = {
    new: "🚀",
    improved: "✨",
    fixed: "🐞",
    known: "⚠️",
  };
  const emojiFor = (type: string): string | null => sectionEmoji[type] ?? null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-10">
      <header className="animate-rise flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-text-muted">{t("subtitle")}</p>
      </header>

      {releases.length === 0 ? (
        <p className="text-sm text-text-muted">{t("empty")}</p>
      ) : (
        <div className="animate-rise-stagger flex flex-col gap-10">
          {releases.map((release) => (
            <section key={release.version} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border-subtle pb-2">
                <h2 dir="ltr" className="text-lg font-semibold tracking-tight">
                  {`v${release.version}`}
                </h2>
                {release.date ? (
                  <time className="text-sm text-text-muted">{release.date}</time>
                ) : null}
              </div>
              {/* The headline says what the release was for, before the list of
                  what it contained. */}
              <p className="text-sm text-text-secondary">{release.headline}</p>
              {release.sections.map((section) => (
                <div key={section.type} className="flex flex-col gap-2">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text-secondary">
                    {emojiFor(section.type) ? (
                      <span aria-hidden="true">{emojiFor(section.type)}</span>
                    ) : null}
                    {localizedLabel(section.type)}
                  </h3>
                  <ul className="flex list-disc flex-col gap-1 ps-5 text-sm text-text-secondary">
                    {section.items.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
