"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CalendarX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty/EmptyState";
import {
  PickupDateTile,
  type PickupDate,
} from "@/components/pickup/PickupDateTile";
import { useCartStore } from "@/lib/stores/cart";

interface PickupPickerProps {
  dates: PickupDate[];
}

export function PickupPicker({ dates }: PickupPickerProps) {
  const { t, i18n } = useTranslation();
  const isEs = (i18n.resolvedLanguage || "es").startsWith("es");
  const locale = isEs ? "es-MX" : "en-US";
  const selectedId = useCartStore((s) => s.pickup_date_id);

  const handleSelect = (id: string) => {
    const d = dates.find((x) => x.id === id);
    if (!d) return;
    const label = new Intl.DateTimeFormat(locale, {
      weekday: "long",
      month: "short",
      day: "numeric",
    }).format(new Date(`${d.date}T00:00:00`));
    toast.success(
      t("pickup.selectedToast", {
        defaultValue: "Pickup date selected for {{date}}",
        date: label,
      })
    );
  };

  if (dates.length === 0) {
    return (
      <EmptyState
        icon={<CalendarX className="h-8 w-8" />}
        title={
          <span>
            Pronto anunciaremos nuevas fechas
            <span className="block text-sm font-normal text-mole/60">
              New dates coming soon
            </span>
          </span>
        }
        description={t(
          "pickup.emptyDesc",
          "Sign up for our newsletter to be the first to know."
        )}
        cta={
          <Button asChild variant="outline">
            <Link href="/">{t("pickup.backHome", "Back Home")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dates.map((d) => (
          <PickupDateTile key={d.id} pickupDate={d} onSelect={handleSelect} />
        ))}
      </div>

      <div className="flex flex-col items-center gap-2 py-4">
        {selectedId ? (
          <Button asChild variant="oro" size="xl">
            <Link href="/menu">
              {t("pickup.continueToMenu", "Continue to Menu")}
            </Link>
          </Button>
        ) : (
          <p className="text-sm text-mole/70">
            {t("pickup.selectHint", "Select a date to continue")}
          </p>
        )}
      </div>
    </div>
  );
}
