"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { Check, Clock } from "lucide-react";
import { cn, formatLbs } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/stores/cart";

export interface PickupDate {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  pickup_start: string; // ISO datetime or "HH:mm"
  pickup_end: string;
  cutoff_at: string; // ISO datetime
  is_open: boolean;
  lbs_remaining: number;
  capacity_lbs?: number;
}

interface PickupDateTileProps {
  pickupDate: PickupDate;
  onSelect?: (id: string) => void;
  className?: string;
}

function useCountdown(target: string): string {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, new Date(target).getTime() - now);
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hrs = Math.floor((totalMin % (60 * 24)) / 60);
  const min = totalMin % 60;
  if (days >= 1) return `${days}d ${hrs}h`;
  if (hrs >= 1) return `${hrs}h ${min}m`;
  return `${min}m`;
}

function formatTimeRange(start: string, end: string, locale: string): string {
  const fmt = (s: string) => {
    const d = s.includes("T") || s.includes(" ") ? new Date(s) : new Date(`1970-01-01T${s}`);
    return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(d);
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

export function PickupDateTile({ pickupDate, onSelect, className }: PickupDateTileProps) {
  const { t, i18n } = useTranslation();
  const isEs = (i18n.resolvedLanguage || "es").startsWith("es");
  const locale = isEs ? "es-MX" : "en-US";

  const activeId = useCartStore((s) => s.pickup_date_id);
  const setPickupDate = useCartStore((s) => s.setPickupDate);
  const isSelected = activeId === pickupDate.id;

  const disabled = !pickupDate.is_open || pickupDate.lbs_remaining <= 0;
  const dateObj = new Date(`${pickupDate.date}T00:00:00`);
  const dayNum = new Intl.DateTimeFormat(locale, { day: "numeric" }).format(dateObj);
  const monthShort = new Intl.DateTimeFormat(locale, { month: "short" }).format(dateObj);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(dateObj);
  const countdown = useCountdown(pickupDate.cutoff_at);

  const handleClick = () => {
    if (disabled) return;
    setPickupDate(pickupDate.id);
    onSelect?.(pickupDate.id);
  };

  return (
    <Card
      variant="default"
      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={isSelected}
      aria-disabled={disabled}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        "group relative cursor-pointer transition-all",
        "hover:shadow-md",
        isSelected && "ring-2 ring-oro",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex flex-col items-center rounded-md bg-nopal px-3 py-2 text-papel">
          <div className="font-display text-2xl font-bold leading-none">{dayNum}</div>
          <div className="text-[10px] uppercase tracking-wider">{monthShort}</div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="font-display text-base font-semibold capitalize text-mole">
              {weekday}
            </div>
            {isSelected && (
              <Badge variant="oro" shape="pill" className="gap-1">
                <Check className="h-3 w-3" /> {t("pickup.selected", "Selected")}
              </Badge>
            )}
          </div>
          <div className="text-xs text-mole/70">
            {formatTimeRange(pickupDate.pickup_start, pickupDate.pickup_end, locale)}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="oro" shape="pill" className="text-[10px]">
              {t("pickup.lbsRemaining", {
                defaultValue: "{{lbs}} remaining",
                lbs: formatLbs(pickupDate.lbs_remaining, locale),
              })}
            </Badge>
            {!disabled && (
              <span className="inline-flex items-center gap-1 text-[11px] text-mole/60">
                <Clock className="h-3 w-3" />
                {t("pickup.cutoffIn", { defaultValue: "cutoff in {{time}}", time: countdown })}
              </span>
            )}
            {disabled && (
              <Badge variant="sale" shape="pill" className="text-[10px]">
                {pickupDate.lbs_remaining <= 0
                  ? t("pickup.soldOut", "Sold Out")
                  : t("pickup.closed", "Closed")}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PickupDateTile;
