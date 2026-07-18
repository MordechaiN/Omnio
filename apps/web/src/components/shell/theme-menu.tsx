"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  useContrast,
  useStyle,
  useTheme,
  type VisualStyle,
} from "@omnio/ui";
import { SunMoon } from "lucide-react";

export function ThemeMenu() {
  const t = useTranslations("theme");
  const { theme, setTheme } = useTheme();
  const { contrast, setContrast } = useContrast();
  const { style, setStyle } = useStyle();

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
            <DropdownMenuLabel>{t("styleLabel")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={style}
              onValueChange={(value) => setStyle(value as VisualStyle)}
            >
              <DropdownMenuRadioItem value="friendly">{t("styleFriendly")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="classic">{t("styleClassic")}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
