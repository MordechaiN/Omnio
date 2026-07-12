"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

export { useTheme };

/**
 * Theme = light | dark | system (default), applied as data-theme on <html>
 * by next-themes (which also injects the pre-hydration script — no flash).
 * Contrast is an independent axis handled by ContrastProvider.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
