"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  className?: string;
  size?: "sm" | "md";
}

export function LanguageToggle({ className, size = "md" }: LanguageToggleProps) {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || "es").slice(0, 2);

  const change = React.useCallback(
    (lng: "es" | "en") => {
      if (lng === current) return;
      void i18n.changeLanguage(lng);
      if (typeof document !== "undefined") {
        document.documentElement.lang = lng;
      }
    },
    [current, i18n]
  );

  const pad = size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm";

  return (
    <div
      role="group"
      aria-label={t("common.languageToggle", "Language")}
      className={cn(
        "inline-flex items-center rounded-full border border-papel/30 bg-nopal-dark/40 p-0.5",
        className
      )}
    >
      <button
        type="button"
        aria-pressed={current === "es"}
        aria-label={t("common.switchToSpanish", "Cambiar a Español")}
        onClick={() => change("es")}
        className={cn(
          "rounded-full font-semibold transition-colors",
          pad,
          current === "es"
            ? "bg-oro text-mole"
            : "text-papel/70 hover:text-papel"
        )}
      >
        ES
      </button>
      <button
        type="button"
        aria-pressed={current === "en"}
        aria-label={t("common.switchToEnglish", "Switch to English")}
        onClick={() => change("en")}
        className={cn(
          "rounded-full font-semibold transition-colors",
          pad,
          current === "en"
            ? "bg-oro text-mole"
            : "text-papel/70 hover:text-papel"
        )}
      >
        EN
      </button>
    </div>
  );
}

export default LanguageToggle;
