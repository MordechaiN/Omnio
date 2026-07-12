"use client";

import { useLocale, useTranslations } from "next-intl";
import { locales, localeNames, type Locale } from "@omnio/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  IconButton,
} from "@omnio/ui";
import { Languages } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleMenu() {
  const t = useTranslations("locale");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchTo(next: string) {
    router.replace(pathname, { locale: next as Locale });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton icon={Languages} aria-label={t("toggle")} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={locale} onValueChange={switchTo}>
          {locales.map((code) => (
            <DropdownMenuRadioItem key={code} value={code} lang={code}>
              {localeNames[code]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
