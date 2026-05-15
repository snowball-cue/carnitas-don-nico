import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import {
  defaultLocale,
  LOCALE_COOKIE_KEY,
  LOCALE_STORAGE_KEY,
  locales,
  type Locale,
} from "./config";

const isBrowser = typeof window !== "undefined";

function readCookieLocale(): Locale | undefined {
  if (!isBrowser || typeof document === "undefined") return undefined;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE_KEY}=([^;]+)`),
  );
  const raw = match?.[1];
  if (raw && (locales as readonly string[]).includes(raw)) {
    return raw as Locale;
  }
  return undefined;
}

function readStorageLocale(): Locale | undefined {
  if (!isBrowser) return undefined;
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw && (locales as readonly string[]).includes(raw)) {
      return raw as Locale;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export function ensureI18n(initialLng?: Locale | null): typeof i18n {
  // On the server we always init eagerly. On the client we wait until the
  // caller passes an explicit `initialLng` (driven by I18nProvider, seeded
  // from the SSR cookie) — otherwise we'd race localStorage against SSR
  // and mismatch the very first render.
  const canInit = !isBrowser || typeof initialLng !== "undefined";

  if (!i18n.isInitialized) {
    if (!canInit) return i18n;
    void i18n.use(initReactI18next).init({
      resources: {
        en: { translation: en },
        es: { translation: es },
      },
      lng: initialLng ?? defaultLocale,
      fallbackLng: defaultLocale,
      supportedLngs: [...locales],
      defaultNS: "translation",
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
      initImmediate: false,
    });
  } else if (initialLng && i18n.language !== initialLng) {
    void i18n.changeLanguage(initialLng);
  }
  return i18n;
}

/** Persist the locale to both localStorage and a cookie so SSR can read it. */
export function persistLocale(lng: Locale): void {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
  if (typeof document !== "undefined") {
    // 1 year, lax, root path — readable on every navigation
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `${LOCALE_COOKIE_KEY}=${lng}; max-age=${oneYear}; path=/; samesite=lax`;
  }
}

export function initI18n(initialLng?: Locale | null) {
  return ensureI18n(initialLng);
}

// On the server, eagerly init with defaultLocale so any usage outside the
// React tree still gets a working i18n. On the client we let I18nProvider
// trigger the first init (see comment in ensureI18n).
if (!isBrowser) ensureI18n();

export default i18n;

/** Read the locale that should be considered "active" on the client — used to
 *  remember the user's preference if it lives in localStorage but no cookie
 *  has been written yet. Safe to call inside effects.
 */
export function readClientPreferredLocale(): Locale | undefined {
  return readCookieLocale() ?? readStorageLocale();
}
