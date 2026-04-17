"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export interface Variant {
  id: string;
  slug: string;
  name_en: string;
  name_es: string;
  price_modifier?: number;
  in_stock?: boolean;
}

interface VariantPickerProps {
  variants: Variant[];
  value?: string;
  onChange: (id: string) => void;
  className?: string;
}

export function VariantPicker({ variants, value, onChange, className }: VariantPickerProps) {
  const { i18n, t } = useTranslation();
  const isEs = (i18n.resolvedLanguage || "es").startsWith("es");

  return (
    <div
      role="radiogroup"
      aria-label={t("menu.chooseVariant", "Choose a cut")}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {variants.map((v) => {
        const selected = v.id === value;
        const disabled = v.in_stock === false;
        const label = isEs ? v.name_es : v.name_en;
        return (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(v.id)}
            className={cn(
              "inline-flex min-h-[44px] items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              selected
                ? "border-oro bg-oro text-mole shadow-sm"
                : "border-nopal/30 bg-papel text-mole hover:border-nopal/60 hover:bg-papel-warm",
              disabled && "cursor-not-allowed opacity-50 line-through"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default VariantPicker;
