"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { trackGuestOrder, type OrderWithDetails } from "@/app/actions/orders";
import { formatCurrency, formatLbs } from "@/lib/utils";

interface Props {
  orderNumber: string;
  initialPhone?: string;
}

export function TrackClient({ orderNumber, initialPhone }: Props) {
  const { t } = useTranslation();
  const [phone, setPhone] = React.useState(initialPhone ?? "");
  const [loading, setLoading] = React.useState(false);
  const [order, setOrder] = React.useState<OrderWithDetails | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const triedInitial = React.useRef(false);

  const lookup = React.useCallback(
    async (p: string) => {
      if (!p) return;
      setLoading(true);
      setError(null);
      const r = await trackGuestOrder(orderNumber, p);
      setLoading(false);
      if (r.success && r.data) {
        setOrder(r.data);
      } else {
        setOrder(null);
        setError(r.error ?? t("common.error", "Something went wrong"));
      }
    },
    [orderNumber, t]
  );

  // Auto-lookup if phone provided in URL
  React.useEffect(() => {
    if (initialPhone && !triedInitial.current) {
      triedInitial.current = true;
      void lookup(initialPhone);
    }
  }, [initialPhone, lookup]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void lookup(phone);
  };

  if (order) {
    const locale = "es-MX";
    const pickupLabel = order.pickup
      ? new Intl.DateTimeFormat(locale, {
          weekday: "long",
          month: "long",
          day: "numeric",
        }).format(new Date(`${order.pickup.pickup_date}T00:00:00`))
      : null;
    const pickupTimeLabel = order.pickup
      ? `${order.pickup.pickup_window_start.slice(0, 5)} – ${order.pickup.pickup_window_end.slice(0, 5)}`
      : null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-mole/70">Status</p>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="rounded-lg border border-nopal/10 bg-papel-warm p-4">
          <p className="text-sm text-mole/70">Pickup</p>
          <p className="font-medium capitalize">{pickupLabel}</p>
          <p className="text-sm text-mole/70">{pickupTimeLabel}</p>
        </div>
        <div className="rounded-lg border border-nopal/10 bg-papel-warm p-4">
          <ul className="divide-y divide-nopal/10 text-sm">
            {order.items.map((it) => (
              <li key={it.id} className="flex justify-between py-2">
                <span>
                  {it.unit === "lb"
                    ? formatLbs(Number(it.quantity), locale)
                    : `x${it.quantity}`}{" "}
                  {it.name_snapshot_es ?? it.name_snapshot_en}
                  {it.variant_snapshot && ` · ${it.variant_snapshot}`}
                </span>
                <span className="tabular-nums">
                  {formatCurrency(Number(it.line_total), locale)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-nopal/10 pt-3 flex justify-between font-bold">
            <span>Total</span>
            <span className="tabular-nums">
              {formatCurrency(Number(order.total), locale)}
            </span>
          </div>
        </div>
        <Button asChild variant="outline" className="w-full">
          <a href="tel:+1-000-000-0000">
            <Phone className="h-4 w-4" />
            {t("orders.contactOwner", "Contact Owner")}
          </a>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="phone">
          {t("track.phoneLabel", "Phone on the order")}
        </Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoFocus
        />
      </div>
      {error && (
        <p className="rounded bg-chile/10 px-3 py-2 text-sm text-chile">
          {error}
        </p>
      )}
      <Button
        type="submit"
        variant="oro"
        size="lg"
        className="w-full"
        disabled={loading}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("track.verify", "Verify & Track")}
      </Button>
    </form>
  );
}
