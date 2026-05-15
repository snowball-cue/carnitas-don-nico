"use client";

import { I18nextProvider } from "react-i18next";
import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { ensureI18n, persistLocale, readClientPreferredLocale } from "./client";
import { defaultLocale, type Locale } from "./config";

export { useTranslation } from "react-i18next";

interface I18nProviderProps {
  children: ReactNode;
  /** Locale resolved on the server (from cookie). Both SSR and CSR initialize
   *  i18n with this exact value so the first render matches. */
  initialLocale?: Locale | null;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const lng: Locale = initialLocale ?? defaultLocale;

  // Initialize the singleton i18n instance with the server-resolved locale.
  // ensureI18n only calls init() the first time and NEVER calls
  // changeLanguage — so this useMemo has zero render-time side effects that
  // would cascade into a re-render loop.
  const i18nInstance = useMemo(() => ensureI18n(lng), [lng]);

  // Post-mount migration: if a customer has a legacy localStorage preference
  // but no cookie, switch language once (safely after paint) and write the
  // cookie so the next request renders in their preferred locale.
  const migratedRef = useRef(false);
  useEffect(() => {
    if (migratedRef.current) return;
    migratedRef.current = true;
    const preferred = readClientPreferredLocale();
    if (preferred && preferred !== i18nInstance.language) {
      void i18nInstance.changeLanguage(preferred);
      persistLocale(preferred);
    } else if (!preferred) {
      // Cookie absent + no localStorage — write cookie so refreshes stay
      // consistent.
      persistLocale(lng);
    }
  }, [lng, i18nInstance]);

  return <I18nextProvider i18n={i18nInstance}>{children}</I18nextProvider>;
}
