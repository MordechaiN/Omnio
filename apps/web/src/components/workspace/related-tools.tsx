"use client";

import { useTranslations } from "next-intl";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { Link } from "@/i18n/navigation";
import { SEARCH_ENTRIES } from "@/generated/registry.search";

/**
 * "More in this category" — up to four sibling tools below a tool surface, so
 * a finished task flows into the next one instead of a dead stop. Hidden when
 * the category has no siblings.
 */
export function RelatedTools({ category, excludeId }: { category: string; excludeId: string }) {
  const t = useTranslations();
  const related = SEARCH_ENTRIES.filter(
    (entry) => entry.category === category && entry.id !== excludeId,
  ).slice(0, 4);

  if (related.length === 0) return null;

  return (
    <aside aria-labelledby="related-tools-title" className="flex flex-col gap-3 border-t border-border-subtle pt-6">
      <h2 id="related-tools-title" className="text-sm font-semibold text-text-secondary">
        {t("toolPage.related")}
      </h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {related.map((entry) => {
          const name = t(`${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof t>[0]);
          return (
            <li key={entry.id}>
              <Link
                href={entry.href}
                className="flex items-center gap-2.5 rounded-lg border border-border-subtle bg-surface px-3 py-2.5 text-sm transition-[border-color,background-color] duration-(--motion-fast) ease-(--ease-out) hover:border-border hover:bg-surface-raised"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent-subtle-fg">
                  <DynamicIcon name={entry.icon as IconName} size={14} />
                </span>
                <span className="truncate font-medium">{name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
