"use client";

import { useTranslation } from "react-i18next";

export function MenuHeroTitle() {
  const { t } = useTranslation();
  return (
    <>
      <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl">
        {t("menu.heroTitle", "Nuestro Menú")}
      </h1>
      <p className="mt-3 text-papel/80 max-w-2xl mx-auto">
        {t(
          "menu.heroSubtitle",
          "Cerdo cocido a fuego lento, cortes surtidos y aguas frescas, listas para recoger.",
        )}
      </p>
    </>
  );
}
