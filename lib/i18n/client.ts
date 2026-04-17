import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import { defaultLocale, LOCALE_STORAGE_KEY, locales } from "./config";

const isBrowser = typeof window !== "undefined";

if (!i18n.isInitialized) {
  const chain = i18n.use(initReactI18next);

  if (isBrowser) {
    // Only attach the language detector in the browser — it touches
    // `window`, `document.cookie` and `localStorage`, which don't exist
    // during SSR. Detection on the server stays on defaultLocale.
    // Dynamic require keeps it out of the server module graph.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const LanguageDetector = require("i18next-browser-languagedetector").default;
    chain.use(LanguageDetector);
  }

  void chain.init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    lng: isBrowser ? undefined : defaultLocale,
    fallbackLng: defaultLocale,
    supportedLngs: [...locales],
    defaultNS: "translation",
    interpolation: { escapeValue: false },
    detection: isBrowser
      ? {
          order: ["localStorage", "navigator", "htmlTag"],
          caches: ["localStorage"],
          lookupLocalStorage: LOCALE_STORAGE_KEY,
        }
      : undefined,
    react: { useSuspense: false },
    initImmediate: false,
  });
}

export function initI18n() {
  return i18n;
}

export default i18n;
