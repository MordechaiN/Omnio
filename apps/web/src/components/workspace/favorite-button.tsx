"use client";

import { useTranslations } from "next-intl";
import { cn } from "@omnio/ui";
import { Star } from "lucide-react";
import { toggleFavorite, useIsFavorite } from "@/lib/preferences";

/**
 * Pin a tool to favorites. Sits over a ToolCard (never nested inside its link),
 * revealed on hover and always shown when active.
 */
export function FavoriteButton({ id, className }: { id: string; className?: string }) {
  const t = useTranslations("common");
  const active = useIsFavorite(id);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? t("removeFavorite") : t("addFavorite")}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(id);
      }}
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-text-muted",
        "transition-[color,opacity,background-color] duration-(--motion-fast) ease-(--ease-out)",
        "hover:bg-surface-raised hover:text-accent focus-visible:opacity-100",
        active ? "text-accent opacity-100" : "opacity-0 group-hover:opacity-100",
        className,
      )}
    >
      <Star size={15} className={active ? "fill-current" : undefined} />
    </button>
  );
}
