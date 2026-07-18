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
 *
 * No "runs on your device" badge here: nearly every tool in the registry is
 * browser-tier, so stamping it on almost every card said nothing — it's
 * already the last clause of each description, and repeated once more on the
 * tool's own page where it actually reassures at the point of use. The rare
 * exception (a server/worker tool) is what's worth flagging, not the norm.
 */
export function ToolCard({ entry }: { entry: SearchEntry }) {
  const t = useTranslations();
  const name = t(`${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof t>[0]);
  const description = t(
    `${entry.i18nNamespace}.${entry.descriptionKey}` as Parameters<typeof t>[0],
  );
  const notOnDevice = t("common.notOnDevice");

  return (
    <div className="group relative h-full">
      <Link
        href={entry.href}
        className="flex h-full flex-col gap-2.5 rounded-xl border border-border-subtle bg-surface p-4 pe-10 transition-[border-color,translate,box-shadow,background-color] duration-(--motion-base) ease-(--ease-out) hover:-translate-y-0.5 hover:border-border hover:bg-surface-raised hover:shadow-2"
      >
        <span className="flex size-10 items-center justify-center rounded-lg bg-accent-subtle text-accent-subtle-fg transition-transform duration-(--motion-base) ease-(--ease-out) group-hover:scale-105">
          <DynamicIcon name={entry.icon as IconName} size={20} />
        </span>
        <span className="font-medium">{name}</span>
        <span className="line-clamp-2 text-sm text-text-muted">{description}</span>
        {entry.tier !== "browser" ? (
          <Badge variant="neutral" className="mt-auto w-fit">
            {notOnDevice}
          </Badge>
        ) : null}
      </Link>
      <FavoriteButton id={entry.id} className="absolute end-2 top-2" />
    </div>
  );
}
