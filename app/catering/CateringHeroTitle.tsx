"use client";

import { useTranslation } from "react-i18next";

export function CateringHeroTitle() {
  const { t } = useTranslation();
  return (
    <>
      <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl">
        {t("catering.heroTitle", "Catering")}
      </h1>
      <p className="mt-3 text-papel/80 max-w-2xl mx-auto">
        {t(
          "catering.heroSubtitle",
          "Feed your crew with our cazo — slow-cooked carnitas for events of 10+.",
        )}
      </p>
    </>
  );
}
