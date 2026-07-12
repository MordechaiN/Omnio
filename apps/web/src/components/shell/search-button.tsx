"use client";

import { useTranslations } from "next-intl";
import { cn, Icon, Kbd } from "@omnio/ui";
import { Search } from "lucide-react";
import { useCommandPalette } from "./palette-context";

/**
 * The search affordance — looks like an input, opens the palette.
 * `size="hero"` is the landing-page variant.
 */
export function SearchButton({ size = "bar" }: { size?: "bar" | "hero" }) {
  const t = useTranslations("shell");
  const { setOpen } = useCommandPalette();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        "flex items-center gap-2.5 rounded-sm border border-border bg-surface text-text-muted",
        "transition-[border-color,box-shadow,background-color] duration-(--motion-fast) ease-(--ease-out)",
        "hover:border-border-strong hover:bg-surface-raised/50",
        size === "bar" && "h-8 w-full max-w-72 px-2.5 text-sm",
        size === "hero" && "h-12 w-full max-w-xl rounded-lg px-4 text-base shadow-1",
      )}
    >
      <Icon icon={Search} size={size === "hero" ? 20 : 16} />
      <span className="flex-1 text-start">{t("searchHint")}</span>
      <span className="hidden items-center gap-0.5 sm:flex" aria-hidden>
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </span>
    </button>
  );
}
