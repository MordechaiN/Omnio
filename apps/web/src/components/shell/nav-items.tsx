"use client";

import { useTranslations } from "next-intl";
import { cn, Icon } from "@omnio/ui";
import { BarChart3, Home, Info, ScrollText, Settings, Star } from "lucide-react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { Link, usePathname } from "@/i18n/navigation";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { ACTIVE_CATEGORY_IDS, TOOL_COUNT_BY_CATEGORY } from "@/lib/categories";
import { SEARCH_ENTRIES } from "@/generated/registry.search";
import { useFavorites } from "@/lib/preferences";

const BY_ID = new Map(SEARCH_ENTRIES.map((entry) => [entry.id, entry]));

function NavLink({
  href,
  icon,
  iconNode,
  label,
  count,
  onNavigate,
}: {
  href: string;
  icon?: React.ComponentProps<typeof Icon>["icon"];
  /** Pre-rendered icon (e.g. a DynamicIcon for registry tools) — used when `icon` is absent. */
  iconNode?: React.ReactNode;
  label: string;
  /** Right-aligned tool count — category rows only. */
  count?: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2.5 rounded-md px-2.5 text-sm",
        "h-(--control-h-sm)",
        "transition-[background-color,color] duration-(--motion-fast) ease-(--ease-out)",
        // A left accent bar marks the active route — Linear-style, more
        // legible than a background tint alone and never color-only (the
        // label also goes bold + full-contrast text).
        "before:absolute before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-0.5 before:rounded-full before:bg-accent before:transition-opacity before:duration-(--motion-fast)",
        "before:start-0",
        active
          ? "bg-accent-subtle font-medium text-text before:opacity-100"
          : "text-text-secondary before:opacity-0 hover:bg-surface-raised hover:text-text",
      )}
    >
      {icon ? (
        <Icon icon={icon} size={16} className={active ? "text-accent" : "text-text-muted"} />
      ) : (
        <span className={cn("flex shrink-0", active ? "text-accent" : "text-text-muted")}>
          {iconNode}
        </span>
      )}
      <span className="truncate">{label}</span>
      {count !== undefined ? (
        <span
          className={cn(
            "ms-auto text-xs tabular-nums",
            active ? "text-text-secondary" : "text-text-muted",
          )}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}

/** The navigation tree — shared by the desktop sidebar and the mobile sheet. */
export function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations();
  // Pinned tools, straight from local preferences — appears once anything is starred.
  const favorites = useFavorites()
    .map((id) => BY_ID.get(id))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
    .slice(0, 6);
  return (
    <div className="flex flex-col gap-6">
      <nav aria-label={t("shell.primaryNavigation")} className="flex flex-col gap-0.5">
        <NavLink href="/" icon={Home} label={t("nav.home")} onNavigate={onNavigate} />
        <NavLink href="/stats" icon={BarChart3} label={t("nav.stats")} onNavigate={onNavigate} />
        <NavLink
          href="/settings"
          icon={Settings}
          label={t("nav.settings")}
          onNavigate={onNavigate}
        />
        <NavLink
          href="/changelog"
          icon={ScrollText}
          label={t("nav.changelog")}
          onNavigate={onNavigate}
        />
        <NavLink href="/about" icon={Info} label={t("nav.about")} onNavigate={onNavigate} />
      </nav>
      {favorites.length > 0 ? (
        <nav aria-label={t("nav.favorites")} className="flex flex-col gap-0.5">
          <p className="mb-1.5 flex items-center gap-1.5 px-2.5 text-xs font-semibold tracking-wide text-text-muted uppercase">
            <Star size={12} aria-hidden="true" />
            {t("nav.favorites")}
          </p>
          {favorites.map((entry) => (
            <NavLink
              key={entry.id}
              href={entry.href}
              iconNode={<DynamicIcon name={entry.icon as IconName} size={16} />}
              label={t(`${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof t>[0])}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      ) : null}

      <nav aria-label={t("shell.categoriesNavigation")} className="flex flex-col gap-0.5">
        <p className="mb-1.5 px-2.5 text-xs font-semibold tracking-wide text-text-muted uppercase">
          {t("nav.categories")}
        </p>
        {ACTIVE_CATEGORY_IDS.map((id) => (
          <NavLink
            key={id}
            href={`/t/${id}`}
            icon={CATEGORY_ICONS[id]}
            label={t(`categories.${id}.name`)}
            count={TOOL_COUNT_BY_CATEGORY.get(id)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </div>
  );
}
