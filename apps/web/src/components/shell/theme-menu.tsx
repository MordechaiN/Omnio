"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  useContrast,
  useTheme,
} from "@omnio/ui";
import { SunMoon } from "lucide-react";
import { Link } from "@/i18n/navigation";

/** Quick theme + contrast toggle. Style, density and accent live in
 * Settings → Appearance — a proper preview needs more room than a menu. */
export function ThemeMenu() {
  const t = useTranslations("theme");
  const { theme, setTheme } = useTheme();
  const { contrast, setContrast } = useContrast();

  // Theme is client-only knowledge; render the control after mount to
  // keep server and client markup identical.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton icon={SunMoon} aria-label={t("toggle")} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
        {mounted ? (
          <>
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
              <DropdownMenuRadioItem value="light">{t("light")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">{t("dark")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">{t("system")}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={contrast === "high"}
              onCheckedChange={(checked) => setContrast(checked ? "high" : "normal")}
            >
              {t("highContrast")}
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">{t("moreAppearance")}</Link>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
