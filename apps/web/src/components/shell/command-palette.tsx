"use client";

import { useTranslations } from "next-intl";
import { locales, localeNames, type Locale } from "@omnio/i18n";
import {
  CommandDialog,
  CommandEmpty,
  CommandFooter,
  CommandFooterHint,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Icon,
  useAccent,
  useContrast,
  useDensity,
  useStyle,
  useTheme,
  type AccentColor,
  type Density,
  type VisualStyle,
} from "@omnio/ui";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import {
  BarChart3,
  Circle,
  Contrast,
  Home,
  Languages,
  Moon,
  Monitor,
  Palette,
  Ruler,
  Settings,
  Sun,
} from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { ACTIVE_CATEGORY_IDS } from "@/lib/categories";
import { SEARCH_ENTRIES } from "@/generated/registry.search";
import { useFavorites } from "@/lib/preferences";
import { useCommandPalette } from "./palette-context";

const BY_ID = new Map(SEARCH_ENTRIES.map((entry) => [entry.id, entry]));

const STYLES: VisualStyle[] = ["classic", "modern", "minimal", "accessible"];
const ACCENTS: AccentColor[] = ["indigo", "blue", "purple", "green", "orange"];
const DENSITIES: Density[] = ["compact", "comfortable", "large"];

/**
 * The command palette — the primary navigation surface
 * (docs/architecture/04-frontend.md §1). Indexes navigation, categories, the
 * tool registry, and every appearance axis (theme/contrast/style/accent/
 * density) as individually searchable commands.
 */
export function CommandPalette() {
  const t = useTranslations();
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const { contrast, setContrast } = useContrast();
  const { style, setStyle } = useStyle();
  const { accent, setAccent } = useAccent();
  const { density, setDensity } = useDensity();
  const favorites = useFavorites()
    .map((id) => BY_ID.get(id))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);

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
          <CommandItem onSelect={() => run(() => router.push("/stats"))}>
            <Icon icon={BarChart3} size={16} />
            {t("nav.stats")}
          </CommandItem>
        </CommandGroup>

        {favorites.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("palette.groupFavorites")}>
              {favorites.map((entry) => {
                const name = t(
                  `${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof t>[0],
                );
                return (
                  <CommandItem
                    key={`fav-${entry.id}`}
                    keywords={[name, ...entry.keywords]}
                    onSelect={() => run(() => router.push(entry.href))}
                  >
                    <DynamicIcon name={entry.icon as IconName} size={16} />
                    {name}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        ) : null}

        {SEARCH_ENTRIES.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("palette.groupTools")}>
              {SEARCH_ENTRIES.map((entry) => {
                const name = t(
                  `${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof t>[0],
                );
                return (
                  <CommandItem
                    key={entry.id}
                    keywords={[name, ...entry.keywords]}
                    onSelect={() => run(() => router.push(entry.href))}
                  >
                    <DynamicIcon name={entry.icon as IconName} size={16} />
                    {name}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        ) : null}

        <CommandSeparator />

        <CommandGroup heading={t("palette.groupCategories")}>
          {ACTIVE_CATEGORY_IDS.map((id) => (
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

        <CommandGroup heading={t("palette.groupStyle")}>
          {STYLES.filter((s) => s !== style).map((s) => (
            <CommandItem key={s} onSelect={() => run(() => setStyle(s))}>
              <Icon icon={Palette} size={16} />
              {t(`theme.style.${s}`)}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("palette.groupAccent")}>
          {ACCENTS.filter((a) => a !== accent).map((a) => (
            <CommandItem key={a} onSelect={() => run(() => setAccent(a))}>
              <Icon icon={Circle} size={16} />
              {t(`theme.accent.${a}`)}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("palette.groupDensity")}>
          {DENSITIES.filter((d) => d !== density).map((d) => (
            <CommandItem key={d} onSelect={() => run(() => setDensity(d))}>
              <Icon icon={Ruler} size={16} />
              {t(`theme.density.${d}`)}
            </CommandItem>
          ))}
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
      <CommandFooter>
        <CommandFooterHint keys={["↑", "↓"]} label={t("palette.hintNavigate")} />
        <CommandFooterHint keys={["↵"]} label={t("palette.hintSelect")} />
        <CommandFooterHint keys={["esc"]} label={t("palette.hintClose")} />
      </CommandFooter>
    </CommandDialog>
  );
}
