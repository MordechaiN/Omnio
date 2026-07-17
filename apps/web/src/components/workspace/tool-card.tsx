"use client";

import { useTranslations } from "next-intl";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { Badge } from "@omnio/ui";
import { Link } from "@/i18n/navigation";
import type { SearchEntry } from "@/generated/registry.search";
import { FavoriteButton } from "./favorite-button";

/**
 * A single launchable tool. Reused across the workspace home, category pages,
 * favorites, and recents so every tool reads the same everywhere. The favorite
 * toggle is an overlay sibling of the link, never nested inside it.
 */
export function ToolCard({ entry }: { entry: SearchEntry }) {
  const t = useTranslations();
  const name = t(`${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof t>[0]);
  const description = t(
    `${entry.i18nNamespace}.${entry.descriptionKey}` as Parameters<typeof t>[0],
  );
  const onDevice = t("common.onDevice");

  return (
    <div className="group relative h-full">
      <Link
        href={entry.href}
        className="flex h-full flex-col gap-2.5 rounded-lg border border-border-subtle bg-surface p-4 pe-10 shadow-1 transition-[border-color,translate,box-shadow] duration-(--motion-base) ease-(--ease-out) hover:-translate-y-0.5 hover:border-border hover:shadow-2"
      >
        <span className="flex size-9 items-center justify-center rounded-md bg-accent-subtle text-accent-subtle-fg">
          <DynamicIcon name={entry.icon as IconName} size={20} />
        </span>
        <span className="font-medium">{name}</span>
        <span className="line-clamp-2 text-sm text-text-muted">{description}</span>
        {entry.tier === "browser" ? (
          <Badge variant="neutral" className="mt-1 w-fit">
            {onDevice}
          </Badge>
        ) : null}
      </Link>
      <FavoriteButton id={entry.id} className="absolute end-2 top-2" />
    </div>
  );
}
