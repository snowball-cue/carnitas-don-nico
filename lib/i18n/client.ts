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

function pickInitialLocale(explicit?: Locale | null): Locale {
  if (explicit) return explicit;
  // Browser: cookie is the SSR source of truth — read it BEFORE React mounts
  // so the very first render matches what the server rendered.
  if (isBrowser) {
    return readCookieLocale() ?? defaultLocale;
  }
  return defaultLocale;
}

function initOnce(lng: Locale): void {
  if (i18n.isInitialized) return;
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

export function ensureI18n(initialLng?: Locale | null): typeof i18n {
  const target = pickInitialLocale(initialLng);
  initOnce(target);
  // If the caller (e.g. server-driven I18nProvider) wants a specific lng
  // that differs from the current one, switch. On the browser the initial
  // language already matches the cookie (which matches SSR), so this is a
  // no-op in the steady state and never causes a hydration mismatch.
  if (i18n.language !== target) {
    void i18n.changeLanguage(target);
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

/** Returns the locale the client prefers if it disagrees with the cookie —
 *  used by I18nProvider to migrate legacy localStorage prefs after first paint.
 */
export function readClientPreferredLocale(): Locale | undefined {
  return readCookieLocale() ?? readStorageLocale();
}

export function initI18n(initialLng?: Locale | null) {
  return ensureI18n(initialLng);
}

// Eagerly init at module load. On the browser this reads the cookie so the
// very first render of any component using useTranslation already has the
// right language. On the server it falls back to defaultLocale; the real
// per-request language is set by I18nProvider once it receives initialLocale.
ensureI18n();

export default i18n;
