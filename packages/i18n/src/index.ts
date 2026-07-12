export const locales = ["en", "he"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeDirections: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  he: "rtl",
};

/** Native names — a language picker always shows each language in itself. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  he: "עברית",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function directionFor(locale: Locale): "ltr" | "rtl" {
  return localeDirections[locale];
}
