"use client";

import { useTranslations } from "next-intl";
import { CATEGORY_IDS } from "@omnio/core";
import { cn, Icon } from "@omnio/ui";
import { BarChart3, Home, Info, ScrollText, Settings } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { CATEGORY_ICONS } from "@/lib/category-icons";

function NavLink({
  href,
  icon,
  label,
  onNavigate,
}: {
  href: string;
  icon: React.ComponentProps<typeof Icon>["icon"];
  label: string;
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
      <Icon icon={icon} size={16} className={active ? "text-accent" : "text-text-muted"} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

/** The navigation tree — shared by the desktop sidebar and the mobile sheet. */
export function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations();
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
      <nav aria-label={t("shell.categoriesNavigation")} className="flex flex-col gap-0.5">
        <p className="mb-1.5 px-2.5 text-xs font-semibold tracking-wide text-text-muted uppercase">
          {t("nav.categories")}
        </p>
        {CATEGORY_IDS.map((id) => (
          <NavLink
            key={id}
            href={`/t/${id}`}
            icon={CATEGORY_ICONS[id]}
            label={t(`categories.${id}.name`)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </div>
  );
}
