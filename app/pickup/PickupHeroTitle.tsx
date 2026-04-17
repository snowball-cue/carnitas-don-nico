"use client";

import { useTranslation } from "react-i18next";

export function PickupHeroTitle() {
  const { t } = useTranslation();
  return (
    <>
      <h1 className="font-display text-4xl md:text-5xl font-bold">
        {t("pickup.heroTitle", "Fechas de Recolección")}
      </h1>
      <p className="mt-3 text-papel/80 max-w-2xl mx-auto">
        {t(
          "pickup.heroSubtitle",
          "Elige el sábado que mejor te quede.",
        )}
      </p>
    </>
  );
}
