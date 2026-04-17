"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";

export function LandingHero() {
  const { t } = useTranslation();
  return (
    <section className="bg-nopal text-papel relative overflow-hidden">
      <div className="container mx-auto px-4 py-16 md:py-24 flex flex-col items-center text-center gap-6">
        <Logo size="hero" className="mb-2" />
        <h1 className="font-display text-4xl md:text-6xl font-bold text-balance leading-tight">
          {t("landing.hero.title")}
        </h1>
        <p className="text-lg md:text-xl text-papel/90 max-w-2xl text-balance">
          {t("landing.hero.subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Button asChild size="lg" variant="oro">
            <Link href="/menu">{t("landing.hero.ctaOrder")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline-papel">
            <Link href="/pickup">{t("landing.hero.ctaPickup")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
