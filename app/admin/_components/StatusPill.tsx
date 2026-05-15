"use client";

import { useTranslation } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  pending: "bg-papel-warm text-mole/80 ring-mole/15",
  confirmed: "bg-agave/20 text-agave ring-agave/30",
  ready: "bg-oro/30 text-mole ring-oro/40",
  picked_up: "bg-nopal/15 text-nopal ring-nopal/30",
  cancelled: "bg-chile/15 text-chile ring-chile/30",
  no_show: "bg-mole/15 text-mole/70 ring-mole/20",
};

const PAYMENT_TONE: Record<string, string> = {
  paid: "bg-nopal/15 text-nopal ring-nopal/30",
  deposit_paid: "bg-oro/25 text-mole ring-oro/40",
  unpaid: "bg-papel-warm text-mole/80 ring-mole/15",
  refunded: "bg-mole/10 text-mole/70 ring-mole/20",
  failed: "bg-chile/15 text-chile ring-chile/30",
};

export function StatusPill({
  status,
  size = "md",
  className,
}: {
  status: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const { t } = useTranslation();
  const tone = TONE[status] ?? "bg-papel-warm text-mole/80 ring-mole/15";
  const label = t(`admin.orders.status_${status}`, { defaultValue: status });
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold ring-1 ring-inset whitespace-nowrap",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}

export function PaymentPill({
  status,
  size = "md",
  className,
}: {
  status: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const { t } = useTranslation();
  const tone = PAYMENT_TONE[status] ?? "bg-papel-warm text-mole/80 ring-mole/15";
  const label = t(`admin.orders.payment_${status}`, { defaultValue: status });
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium ring-1 ring-inset whitespace-nowrap",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}
