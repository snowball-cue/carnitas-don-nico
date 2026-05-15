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
  if (typeof document === "undefined") return undefined;
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

/** Initialize i18n with a specific locale. Idempotent — only the first call
 *  actually runs init(). Crucially: NEVER changes language after init.
 *  Language switches happen via LanguageToggle clicks or I18nProvider's
 *  post-mount migration effect, both of which are safely outside render.
 */
export function ensureI18n(lng: Locale): typeof i18n {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources: {
        en: { translation: en },
        es: { translation: es },
      },
      lng,
      fallbackLng: defaultLocale,
      supportedLngs: [...locales],
      defaultNS: "translation",
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
      initImmediate: false,
    });
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
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `${LOCALE_COOKIE_KEY}=${lng}; max-age=${oneYear}; path=/; samesite=lax`;
  }
}

/** Returns the locale the client wants — used post-mount to migrate legacy
 *  localStorage-only users into the cookie-based system without flashing
 *  during the first render.
 */
export function readClientPreferredLocale(): Locale | undefined {
  return readCookieLocale() ?? readStorageLocale();
}

export default i18n;
