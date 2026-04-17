export const locales = ["es", "en"] as const;
export type Locale = (typeof locales)[number];

/** Spanish is the default — Don Nico's core audience is Mexican. */
export const defaultLocale: Locale = "es";

export const namespaces = ["translation"] as const;
export const defaultNamespace = "translation";

export const LOCALE_STORAGE_KEY = "carnitas-dn-locale";

export const localeLabels: Record<Locale, string> = {
  es: "Español",
  en: "English",
};
