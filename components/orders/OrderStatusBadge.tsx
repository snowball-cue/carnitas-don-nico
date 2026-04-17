"use client";

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "ready"
  | "picked_up"
  | "cancelled"
  | "no_show";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const STYLES: Record<OrderStatus, string> = {
  pending: "bg-talavera text-papel",
  confirmed: "bg-oro text-mole",
  ready: "bg-agave-sage text-papel",
  picked_up: "bg-mole/20 text-mole",
  cancelled: "bg-chile text-papel",
  no_show: "bg-chile/80 text-papel",
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        STYLES[status],
        className
      )}
    >
      {t(`orderStatus.${status}`, status.replace("_", " "))}
    </span>
  );
}

export default OrderStatusBadge;
