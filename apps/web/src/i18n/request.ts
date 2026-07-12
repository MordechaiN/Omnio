import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import type { Locale } from "@omnio/i18n";
import en from "@omnio/i18n/messages/en.json";
import he from "@omnio/i18n/messages/he.json";
import { routing } from "./routing";

// Static imports keep bundlers honest (dynamic specifiers defeat the
// package-exports resolver). Catalogs are small; revisit if that changes.
const MESSAGES: Record<Locale, typeof en> = { en, he };

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: MESSAGES[locale],
  };
});
