"use client";

import { I18nextProvider } from "react-i18next";
import { type ReactNode, useEffect, useMemo } from "react";
import { ensureI18n, persistLocale, readClientPreferredLocale } from "./client";
import type { Locale } from "./config";

export { useTranslation } from "react-i18next";

interface I18nProviderProps {
  children: ReactNode;
  /** Locale resolved on the server (from cookie); used as the initial language so SSR and CSR match. */
  initialLocale?: Locale | null;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const i18nInstance = useMemo(
    () => ensureI18n(initialLocale ?? null),
    [initialLocale],
  );

  // Migration: if the user has a preferred locale stored client-side but no
  // cookie was sent to the server, switch after first paint (avoids
  // hydration mismatch) and persist the cookie so next request is correct.
  useEffect(() => {
    const preferred = readClientPreferredLocale();
    if (preferred && preferred !== i18nInstance.language) {
      void i18nInstance.changeLanguage(preferred);
      persistLocale(preferred);
    } else if (initialLocale && preferred !== initialLocale) {
      // Ensure cookie is set so refreshes stay consistent.
      persistLocale(initialLocale);
    }
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <I18nextProvider i18n={i18nInstance}>{children}</I18nextProvider>;
}
