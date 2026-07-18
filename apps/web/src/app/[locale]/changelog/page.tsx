import { readFileSync } from "node:fs";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { parseChangelog, sectionLabel, type Release } from "@/lib/changelog";

// Read + parse at build; the changelog content is baked into the static page,
// so the standalone runtime never needs the source file. Kept fully static.
export const dynamic = "force-static";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** The root CHANGELOG.md lives two levels up from apps/web at build time. */
function loadReleases(): Release[] {
  const candidates = [
    join(process.cwd(), "CHANGELOG.md"),
    join(process.cwd(), "..", "..", "CHANGELOG.md"),
  ];
  for (const path of candidates) {
    try {
      return parseChangelog(readFileSync(path, "utf8"));
    } catch {
      // try the next candidate
    }
  }
  return [];
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
  const releases = loadReleases();

  // Localize the known Keep-a-Changelog section names; fall back to the raw name.
  const sectionNames: Record<string, string> = {
    new: t("sections.new"),
    changed: t("sections.changed"),
    fixed: t("sections.fixed"),
    security: t("sections.security"),
    removed: t("sections.removed"),
    deprecated: t("sections.deprecated"),
    "known limitations": t("sections.known"),
  };
  const localizedLabel = (type: string): string => {
    const label = sectionLabel(type);
    return sectionNames[label.toLowerCase()] ?? label;
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-text-muted">{t("subtitle")}</p>
      </header>

      {releases.length === 0 ? (
        <p className="text-sm text-text-muted">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-10">
          {releases.map((release) => (
            <section key={release.version} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border-subtle pb-2">
                <h2 dir="ltr" className="text-lg font-semibold tracking-tight">
                  v{release.version}
                </h2>
                {release.date ? (
                  <time className="text-sm text-text-muted">{release.date}</time>
                ) : null}
                {release.yanked ? (
                  <span className="text-xs font-medium text-danger">{t("yanked")}</span>
                ) : null}
              </div>
              {release.sections.map((section) => (
                <div key={section.type} className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold text-text-secondary">
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
