"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { Button } from "@/components/ui/button";

interface LandingUrgencyBannerProps {
  pickup: {
    id: string;
    pickup_date: string;
    pickup_window_start: string;
    pickup_window_end: string;
    capacity_lbs: number;
    reserved_lbs: number;
  };
}

export function LandingUrgencyBanner({ pickup }: LandingUrgencyBannerProps) {
  const { t, i18n } = useTranslation();
  const remaining = Math.max(
    0,
    Number(pickup.capacity_lbs) - Number(pickup.reserved_lbs),
  );
  const soldOut = remaining <= 0;
  const localeTag = i18n.language === "es" ? "es-MX" : "en-US";
  const dateFmt = new Date(pickup.pickup_date + "T12:00:00").toLocaleDateString(
    localeTag,
    { weekday: "long", month: "long", day: "numeric" },
  );

  return (
    <section className="bg-oro text-nopal-dark py-4 border-y border-nopal-dark/20">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
        <div>
          <p className="font-display text-lg font-semibold">
            {t("landing.urgency.title")} · {dateFmt}
          </p>
          <p className="text-sm">
            {soldOut
              ? t("landing.urgency.soldOut")
              : t("landing.urgency.lbsRemaining", {
                  lbs: remaining.toFixed(1),
                })}
          </p>
        </div>
        {!soldOut ? (
          <Button asChild size="sm" variant="default">
            <Link href="/menu">{t("landing.urgency.reserveNow")}</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
