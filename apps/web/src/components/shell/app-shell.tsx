"use client";

import { useTranslations } from "next-intl";
import { SkipLink } from "@omnio/ui";
import { Link } from "@/i18n/navigation";
import { CommandPalette } from "./command-palette";
import { LocaleMenu } from "./locale-menu";
import { MobileNav } from "./mobile-nav";
import { NavItems } from "./nav-items";
import { PaletteProvider } from "./palette-context";
import { SearchButton } from "./search-button";
import { ThemeMenu } from "./theme-menu";
import { UserMenu } from "./user-menu";
import { FileDropProvider } from "@/components/files/file-drop-provider";
import { JobsProvider } from "@/components/jobs/jobs-provider";
import { JobsTray } from "@/components/jobs/jobs-tray";

/**
 * The persistent application frame: sidebar (desktop) / sheet (mobile),
 * top bar with search + preference menus, and the command palette.
 * Desktop-app feel: the frame never reloads; only the content area changes.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations();

  return (
    <JobsProvider>
      <PaletteProvider>
        <FileDropProvider>
          <SkipLink>{t("shell.skipToContent")}</SkipLink>
          <div className="flex min-h-dvh">
            {/* Sidebar — desktop only; the same tree lives in MobileNav's sheet. */}
            <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 overflow-y-auto border-e border-border-subtle px-3 py-4 lg:flex">
              <Link
                href="/"
                className="flex items-center gap-2 px-2.5 text-base font-semibold tracking-tight"
              >
                <span className="flex size-6 items-center justify-center rounded-sm bg-accent text-xs font-bold text-accent-fg">
                  O
                </span>
                {t("common.appName")}
              </Link>
              <NavItems />
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
              <header className="sticky top-0 z-(--z-sticky) flex h-13 items-center gap-3 border-b border-border-subtle bg-bg/80 px-4 backdrop-blur-(--blur-backdrop)">
                <MobileNav />
                <Link href="/" className="flex items-center gap-2 font-semibold lg:hidden">
                  <span className="flex size-6 items-center justify-center rounded-sm bg-accent text-xs font-bold text-accent-fg">
                    O
                  </span>
                  <span className="sr-only sm:not-sr-only">{t("common.appName")}</span>
                </Link>
                <div className="flex flex-1 justify-center lg:justify-start">
                  <SearchButton size="bar" />
                </div>
                <div className="flex items-center gap-1">
                  <JobsTray />
                  <ThemeMenu />
                  <LocaleMenu />
                  <UserMenu />
                </div>
              </header>

              <main id="main" className="flex-1">
                {children}
              </main>
            </div>
          </div>
          <CommandPalette />
        </FileDropProvider>
      </PaletteProvider>
    </JobsProvider>
  );
}
