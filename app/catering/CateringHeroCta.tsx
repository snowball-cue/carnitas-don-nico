"use client";

import Link from "next/link";
import { Utensils } from "lucide-react";
import { useTranslation } from "react-i18next";

export function CateringHeroCta() {
  const { t } = useTranslation();
  return (
    <Link
      href="#catering-form"
      className="inline-flex items-center gap-2 rounded-full bg-oro px-6 py-3 text-mole font-semibold shadow-sm hover:bg-oro-light"
    >
      <Utensils className="h-4 w-4" />
      <span>{t("catering.heroCta", "Request a quote")}</span>
    </Link>
  );
}
