"use client";

import { I18nextProvider } from "react-i18next";
import { useEffect, useState, type ReactNode } from "react";
import i18n, { initI18n } from "./client";

export { useTranslation } from "react-i18next";

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initI18n();
    setReady(true);
  }, []);

  if (!ready) {
    // Render children anyway — i18n keys fall back to defaultLocale synchronously
    // once resources register. Avoids full-page flash.
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
