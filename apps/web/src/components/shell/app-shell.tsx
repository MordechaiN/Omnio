"use client";

import { useTranslations } from "next-intl";
import { SkipLink } from "@omnio/ui";
import { Link } from "@/i18n/navigation";
import { CommandPalette } from "./command-palette";
import { FileIntelligence } from "./file-intelligence";
import { LocaleMenu } from "./locale-menu";
import { MobileNav } from "./mobile-nav";
import { NavItems } from "./nav-items";
import { PaletteProvider } from "./palette-context";
import { SearchButton } from "./search-button";
import { ThemeMenu } from "./theme-menu";
import { UserMenu } from "./user-menu";
import { JobsProvider } from "@/components/jobs/jobs-provider";
import { JobsTray } from "@/components/jobs/jobs-tray";

function Wordmark({ compact }: { compact?: boolean }) {
  const t = useTranslations();
  return (
    <Link
      href="/"
      className={compact ? "flex items-center gap-2 font-semibold" : "flex items-center gap-2 px-1"}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-accent text-xs font-bold text-accent-fg">
        O
      </span>
      <span className={compact ? "sr-only sm:not-sr-only" : "text-[15px] font-semibold tracking-tight"}>
        {t("common.appName")}
      </span>
    </Link>
  );
}

/**
 * The persistent application frame: sidebar (desktop) / sheet (mobile),
 * top bar with breadcrumb-space + preference menus, and the command palette.
 * The sidebar carries its own surface tint (a shade off the page background)
 * for the two-panel depth of a desktop app rather than a single flat plane;
 * search lives there as the primary entry point, Raycast/Arc-style. Desktop
 * feel: the frame never reloads; only the content area changes.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations();

  return (
    <JobsProvider>
      <PaletteProvider>
          <SkipLink>{t("shell.skipToContent")}</SkipLink>
          <div className="flex min-h-dvh bg-bg">
            {/* Sidebar — desktop only; the same tree lives in MobileNav's sheet. */}
            <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-4 overflow-y-auto border-e border-border-subtle bg-surface px-3 py-3.5 lg:flex">
              <Wordmark />
              <SearchButton size="sidebar" />
              <div className="min-h-0 flex-1 overflow-y-auto">
                <NavItems />
              </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
              <header className="sticky top-0 z-(--z-sticky) flex h-13 items-center gap-3 border-b border-border-subtle bg-bg/85 px-4 backdrop-blur-(--blur-backdrop)">
                <MobileNav />
                <div className="lg:hidden">
                  <Wordmark compact />
                </div>
                <div className="flex flex-1 justify-center lg:hidden">
                  <SearchButton size="bar" />
                </div>
                <div className="ms-auto flex items-center gap-1">
                  <JobsTray />
                  <ThemeMenu />
                  <LocaleMenu />
                  <UserMenu />
                </div>
              </header>

              <main id="main" className="flex-1 bg-bg">
                {children}
              </main>
            </div>
          </div>
          <CommandPalette />
          <FileIntelligence />
      </PaletteProvider>
    </JobsProvider>
  );
}
