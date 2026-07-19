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
  Keyboard,
  Languages,
  Moon,
  Monitor,
  Palette,
  Ruler,
  Settings,
  Sun,
} from "lucide-react";
import { useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { ACTIVE_CATEGORY_IDS } from "@/lib/categories";
import { SEARCH_ENTRIES } from "@/generated/registry.search";
import {
  useCollections,
  useFavorites,
  useRecentTools,
  useWorkflows,
} from "@/lib/preferences";
import { expandKeywords } from "@/lib/search-synonyms";
import { makePaletteFilter } from "@/lib/search-score";
import { workflowStepHref } from "@/components/workspace/workflows-section";
import { ShortcutsDialog } from "./shortcuts-dialog";
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
  const collections = useCollections();
  const workflows = useWorkflows();
  const recentIds = useRecentTools();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const toolName = (entry: (typeof SEARCH_ENTRIES)[number]) =>
    t(`${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof t>[0]);

  const recents = recentIds
    .map((id) => BY_ID.get(id))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
    .slice(0, 4);

  // Typo-tolerant, tiered ranking with personal boosts (lib/search-score).
  // Rebuilt per render — a few dozen names, negligible next to cmdk's own work.
  const filter = makePaletteFilter({
    favorites: new Set(favorites.map((entry) => toolName(entry).toLowerCase())),
    recents: recents.map((entry) => toolName(entry).toLowerCase()),
  });

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <>
    <CommandDialog open={open} onOpenChange={setOpen} title={t("palette.title")} filter={filter}>
      <CommandInput placeholder={t("palette.placeholder")} />
      <CommandList>
        <CommandEmpty>
          {/* A dead end becomes a fork: explain, then offer somewhere to go. */}
          <div className="flex flex-col items-center gap-3 px-4 py-2">
            <p>{t("palette.empty")}</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {ACTIVE_CATEGORY_IDS.slice(0, 5).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => run(() => router.push(`/t/${id}`))}
                  className="rounded-md border border-border-subtle px-2 py-1 text-xs text-text-secondary transition-colors duration-(--motion-fast) hover:border-border hover:bg-surface-raised hover:text-text"
                >
                  {t(`categories.${id}.name`)}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted">{t("palette.emptyTip")}</p>
          </div>
        </CommandEmpty>

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
          <CommandItem onSelect={() => run(() => setShortcutsOpen(true))}>
            <Icon icon={Keyboard} size={16} />
            {t("shortcuts.title")}
          </CommandItem>
        </CommandGroup>

        {recents.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("palette.groupRecent")}>
              {recents.map((entry) => {
                const name = toolName(entry);
                return (
                  <CommandItem
                    key={`rec-${entry.id}`}
                    keywords={[name, ...expandKeywords(entry.id, entry.keywords)]}
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
                    keywords={[name, ...expandKeywords(entry.id, entry.keywords)]}
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

        {collections.length > 0 || workflows.length > 0 ? (
          <>
            <CommandSeparator />
            {collections.length > 0 ? (
              <CommandGroup heading={t("palette.groupCollections")}>
                {collections.map((collection) => (
                  <CommandItem
                    key={`col-${collection.id}`}
                    onSelect={() => run(() => router.push(`/#c-${collection.id}`))}
                  >
                    <span aria-hidden="true">{collection.emoji}</span>
                    {collection.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {workflows.length > 0 ? (
              <CommandGroup heading={t("palette.groupWorkflows")}>
                {workflows.map((workflow) => (
                  <CommandItem
                    key={`wf-${workflow.id}`}
                    onSelect={() => run(() => router.push(workflowStepHref(workflow, 0)))}
                  >
                    <span aria-hidden="true">{workflow.emoji}</span>
                    {workflow.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
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
                    keywords={[name, ...expandKeywords(entry.id, entry.keywords)]}
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
    <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  );
}
