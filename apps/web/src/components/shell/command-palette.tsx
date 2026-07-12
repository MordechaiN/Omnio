"use client";

import { useTranslations } from "next-intl";
import { CATEGORY_IDS } from "@omnio/core";
import { locales, localeNames, type Locale } from "@omnio/i18n";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Icon,
  useContrast,
  useTheme,
} from "@omnio/ui";
import { Contrast, Home, Languages, Moon, Monitor, Settings, Sun } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { useCommandPalette } from "./palette-context";

/**
 * The command palette — the primary navigation surface
 * (docs/architecture/04-frontend.md §1). In M2 it indexes navigation,
 * categories, theme, contrast and language; the tool registry plugs into
 * the same groups in M4 via registry.search.ts.
 */
export function CommandPalette() {
  const t = useTranslations();
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const { contrast, setContrast } = useContrast();

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title={t("palette.title")}>
      <CommandInput placeholder={t("palette.placeholder")} />
      <CommandList>
        <CommandEmpty>{t("palette.empty")}</CommandEmpty>

        <CommandGroup heading={t("palette.groupNavigation")}>
          <CommandItem onSelect={() => run(() => router.push("/"))}>
            <Icon icon={Home} size={16} />
            {t("palette.goHome")}
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/settings"))}>
            <Icon icon={Settings} size={16} />
            {t("nav.settings")}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("palette.groupCategories")}>
          {CATEGORY_IDS.map((id) => (
            <CommandItem key={id} onSelect={() => run(() => router.push(`/t/${id}`))}>
              <Icon icon={CATEGORY_ICONS[id]} size={16} />
              {t(`categories.${id}.name`)}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("palette.groupTheme")}>
          <CommandItem onSelect={() => run(() => setTheme("light"))}>
            <Icon icon={Sun} size={16} />
            {t("palette.themeLight")}
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("dark"))}>
            <Icon icon={Moon} size={16} />
            {t("palette.themeDark")}
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("system"))}>
            <Icon icon={Monitor} size={16} />
            {t("palette.themeSystem")}
          </CommandItem>
          <CommandItem
            onSelect={() => run(() => setContrast(contrast === "high" ? "normal" : "high"))}
          >
            <Icon icon={Contrast} size={16} />
            {contrast === "high" ? t("palette.contrastNormal") : t("palette.contrastHigh")}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("palette.groupLanguage")}>
          {locales.map((code) => (
            <CommandItem
              key={code}
              onSelect={() => run(() => router.replace(pathname, { locale: code as Locale }))}
            >
              <Icon icon={Languages} size={16} />
              <span lang={code}>{localeNames[code]}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
