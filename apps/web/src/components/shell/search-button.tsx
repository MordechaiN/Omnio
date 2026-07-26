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
          "h-(--control-h-md) w-auto min-w-(--control-h-md) justify-center rounded-sm border border-border bg-surface px-2.5 text-sm hover:border-border-strong hover:bg-surface-raised/50 min-[420px]:w-full min-[420px]:max-w-72 min-[420px]:justify-start",
        size === "hero" &&
          "h-12 w-full max-w-xl rounded-lg border border-border bg-surface px-4 text-base shadow-1 hover:border-border-strong hover:bg-surface-raised/50",
        size === "sidebar" &&
          "h-(--control-h-md) w-full rounded-md border border-border-subtle bg-bg px-2.5 text-sm hover:border-border hover:bg-bg/60",
      )}
    >
      <Icon icon={Search} size={size === "hero" ? 20 : 16} className="shrink-0" />
      {/* On the narrowest phones the top bar cannot hold a labelled field
          alongside the menu, wordmark and four controls. Below 420px the bar
          form drops its placeholder and reads as a search button — still
          visible, still tappable, still labelled for screen readers — rather
          than squeezing the label into a few unreadable pixels. */}
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-start",
          size === "bar" && "hidden min-[420px]:block",
        )}
      >
        {size === "sidebar" ? t("searchHintShort") : t("searchHint")}
      </span>
      <span className="hidden shrink-0 items-center gap-0.5 sm:flex" aria-hidden>
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </span>
    </button>
  );
}
