"use client";

import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { Button } from "@/components/ui/button";

export function LandingCateringBanner() {
  const { t } = useTranslation();
  return (
    <section className="bg-papel-warm py-12">
      <div className="container mx-auto px-4">
        <div className="rounded-2xl border border-oro/40 bg-nopal text-papel p-6 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-cazo-2">
          <div className="h-14 w-14 shrink-0 rounded-full bg-oro text-mole flex items-center justify-center">
            <UtensilsCrossed className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-2xl md:text-3xl font-bold">
              {t(
                "landing.catering.title",
                "Feeding 10+? Catering available.",
              )}
            </h3>
            <p className="text-papel/80 mt-2">
              {t(
                "landing.catering.body",
                "Quinceañeras, weddings, work lunches, family gatherings — let Don Nico's cazo handle it.",
              )}
            </p>
          </div>
          <Button asChild size="lg" variant="oro" className="shrink-0">
            <Link href="/catering">
              {t("landing.catering.cta", "See catering")}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
