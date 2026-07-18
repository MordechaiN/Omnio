"use client";

import { useTranslations } from "next-intl";
import { cn, Icon, Kbd } from "@omnio/ui";
import { Search } from "lucide-react";
import { useCommandPalette } from "./palette-context";

/**
 * The search affordance — looks like an input, opens the palette.
 * `size="sidebar"` sits recessed at the top of the desktop sidebar (the
 * primary entry point, Raycast/Arc-style); `size="bar"` is the mobile/top-bar
 * fallback; `size="hero"` is for standalone marketing-style placements.
 */
export function SearchButton({ size = "bar" }: { size?: "bar" | "hero" | "sidebar" }) {
  const t = useTranslations("shell");
  const { setOpen } = useCommandPalette();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={t("search")}
      className={cn(
        "flex items-center gap-2.5 text-text-muted",
        "transition-[border-color,box-shadow,background-color] duration-(--motion-fast) ease-(--ease-out)",
        size === "bar" &&
          "h-(--control-h-md) w-full max-w-72 rounded-sm border border-border bg-surface px-2.5 text-sm hover:border-border-strong hover:bg-surface-raised/50",
        size === "hero" &&
          "h-12 w-full max-w-xl rounded-lg border border-border bg-surface px-4 text-base shadow-1 hover:border-border-strong hover:bg-surface-raised/50",
        size === "sidebar" &&
          "h-(--control-h-md) w-full rounded-md border border-border-subtle bg-bg px-2.5 text-sm hover:border-border hover:bg-bg/60",
      )}
    >
      <Icon icon={Search} size={size === "hero" ? 20 : 16} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate text-start">
        {size === "sidebar" ? t("searchHintShort") : t("searchHint")}
      </span>
      <span className="hidden shrink-0 items-center gap-0.5 sm:flex" aria-hidden>
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </span>
    </button>
  );
}
