"use client";

import { useTranslation } from "@/lib/i18n/I18nProvider";

export function AdminCateringTitle() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-2xl text-mole">
        {t("admin.catering.title", "Catering requests")}
      </h1>
    </div>
  );
}
