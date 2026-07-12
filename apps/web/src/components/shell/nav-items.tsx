"use client";

import { useTranslations } from "next-intl";
import { CATEGORY_IDS } from "@omnio/core";
import { cn, Icon } from "@omnio/ui";
import { Home, Settings } from "lucide-react";
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
        "flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-sm",
        "transition-colors duration-(--motion-fast) ease-(--ease-out)",
        active
          ? "bg-surface-raised font-medium text-text"
          : "text-text-secondary hover:bg-surface-raised/70 hover:text-text",
      )}
    >
      <Icon icon={icon} size={16} className={active ? "text-accent" : "text-text-muted"} />
      {label}
    </Link>
  );
}

/** The navigation tree — shared by the desktop sidebar and the mobile sheet. */
export function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations();
  return (
    <div className="flex flex-col gap-5">
      <nav aria-label={t("shell.primaryNavigation")} className="flex flex-col gap-0.5">
        <NavLink href="/" icon={Home} label={t("nav.home")} onNavigate={onNavigate} />
        <NavLink
          href="/settings"
          icon={Settings}
          label={t("nav.settings")}
          onNavigate={onNavigate}
        />
      </nav>
      <nav aria-label={t("shell.categoriesNavigation")} className="flex flex-col gap-0.5">
        <p className="mb-1 px-2.5 text-xs font-medium text-text-muted">{t("nav.categories")}</p>
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
