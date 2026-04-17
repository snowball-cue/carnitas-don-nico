"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import { defaultLocale, LOCALE_STORAGE_KEY, locales } from "./config";

let initialized = false;

export function initI18n() {
  if (initialized) return i18n;
  initialized = true;

  void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        es: { translation: es },
      },
      fallbackLng: defaultLocale,
      supportedLngs: [...locales],
      defaultNS: "translation",
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator", "htmlTag"],
        caches: ["localStorage"],
        lookupLocalStorage: LOCALE_STORAGE_KEY,
      },
      react: { useSuspense: false },
    });

  return i18n;
}

export default i18n;
