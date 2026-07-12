import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "@omnio/i18n";

export const routing = defineRouting({
  locales,
  defaultLocale,
  // English lives at /, Hebrew at /he — clean URLs for the common case.
  localePrefix: "as-needed",
});
