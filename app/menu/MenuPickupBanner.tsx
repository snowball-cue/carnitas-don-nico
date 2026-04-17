"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { CalendarClock } from "lucide-react";
import { useCartStore } from "@/lib/stores/cart";

export function MenuPickupBanner() {
  const { t } = useTranslation();
  const pickupDateId = useCartStore((s) => s.pickup_date_id);
  if (pickupDateId) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-oro/60 bg-papel-warm px-4 py-3 text-mole shadow-sm">
      <CalendarClock className="h-5 w-5 mt-0.5 shrink-0 text-nopal" />
      <div className="flex-1">
        <p className="font-medium">
          {t(
            "menu.pickupBannerTitle",
            "Selecciona una fecha de pickup primero / Pick a date first"
          )}
        </p>
        <p className="text-sm text-mole/70">
          {t(
            "menu.pickupBannerBody",
            "We cook to reservation — choose a pickup day before adding items."
          )}
        </p>
      </div>
      <Link
        href="/pickup"
        className="shrink-0 rounded-full bg-oro px-4 py-2 text-sm font-semibold text-mole hover:bg-oro-light"
      >
        {t("menu.pickupBannerCta", "Choose date")}
      </Link>
    </div>
  );
}
