import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { directionFor } from "@omnio/i18n";
import {
  ContrastProvider,
  contrastInitScript,
  ThemeProvider,
  Toaster,
  TooltipProvider,
} from "@omnio/ui";
import "@omnio/ui/fonts";
import "../globals.css";
import { routing } from "@/i18n/routing";
import { AppShell } from "@/components/shell/app-shell";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthGate } from "@/components/auth/auth-gate";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    title: {
      default: `${t("appName")} — ${t("tagline")}`,
      template: `%s · ${t("appName")}`,
    },
    description: t("tagline"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const dir = directionFor(locale);

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        {/* Applies stored contrast preference before first paint — no flash. */}
        <script dangerouslySetInnerHTML={{ __html: contrastInitScript }} />
      </head>
      <body className="antialiased">
        <NextIntlClientProvider>
          <ThemeProvider>
            <ContrastProvider>
              <TooltipProvider delayDuration={300}>
                <QueryProvider>
                  <AuthGate>
                    <AppShell>{children}</AppShell>
                  </AuthGate>
                </QueryProvider>
                <Toaster dir={dir} />
              </TooltipProvider>
            </ContrastProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
