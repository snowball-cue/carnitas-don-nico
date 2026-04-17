"use client";

import { useTranslation } from "@/lib/i18n/I18nProvider";

export function CapacityBar({
  reserved,
  capacity,
}: {
  reserved: number;
  capacity: number;
}) {
  const { t } = useTranslation();
  const pct = capacity > 0 ? Math.min(100, Math.round((reserved / capacity) * 100)) : 0;
  const color = pct >= 90 ? "bg-chile" : pct >= 70 ? "bg-oro" : "bg-agave";
  return (
    <div>
      <div className="flex justify-between text-sm text-mole/80 mb-1">
        <span>
          {t("admin.dashboard.capacityLabel", {
            reserved: reserved.toFixed(1),
            capacity: capacity.toFixed(1),
          })}
        </span>
        <span className="font-semibold text-mole">{pct}%</span>
      </div>
      <div
        className="h-3 w-full rounded-full bg-papel-warm overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
