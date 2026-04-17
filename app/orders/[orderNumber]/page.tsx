import { notFound } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { getOrder } from "@/app/actions/orders";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderDetailActions } from "./OrderDetailActions";
import { formatCurrency, formatLbs, cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/database";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orderNumber: string }>;
}

const TIMELINE: OrderStatus[] = [
  "pending",
  "confirmed",
  "ready",
  "picked_up",
];

export default async function OrderDetailPage({ params }: PageProps) {
  const { orderNumber } = await params;
  const res = await getOrder(orderNumber);
  if (!res.success || !res.data) notFound();
  const order = res.data;

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

  const currentStep = TIMELINE.indexOf(order.status);
  const isCancelled = order.status === "cancelled" || order.status === "no_show";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/orders"
        className="text-sm text-nopal underline mb-4 inline-block"
      >
        ← Back to orders
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <h1 className="font-display text-3xl font-bold text-mole">
          {order.order_number}
        </h1>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Timeline */}
      {!isCancelled && (
        <ol className="mb-6 flex items-center gap-2">
          {TIMELINE.map((step, i) => {
            const done = i <= currentStep;
            const active = i === currentStep;
            return (
              <li key={step} className="flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold",
                      done
                        ? "bg-nopal text-papel"
                        : "bg-papel-warm text-mole/40 border border-nopal/20"
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  {i < TIMELINE.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1",
                        done ? "bg-nopal" : "bg-nopal/20"
                      )}
                    />
                  )}
                </div>
                <p
                  className={cn(
                    "mt-1 text-xs capitalize",
                    active ? "font-semibold text-mole" : "text-mole/60"
                  )}
                >
                  {step.replace("_", " ")}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      <div className="rounded-lg border border-nopal/10 bg-papel-warm/50 p-5 mb-4">
        <p className="text-sm text-mole/70">Pickup</p>
        <p className="font-display text-lg font-semibold text-mole capitalize">
          {pickupLabel}
        </p>
        <p className="text-sm text-mole/70">{pickupTimeLabel}</p>
      </div>

      <div className="rounded-lg border border-nopal/10 bg-papel-warm/50 p-5 mb-4">
        <h2 className="font-display text-lg font-semibold text-mole mb-3">
          Items
        </h2>
        <ul className="divide-y divide-nopal/10">
          {order.items.map((it) => (
            <li key={it.id} className="flex justify-between py-2 text-sm">
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
        <div className="mt-3 space-y-1 text-sm border-t border-nopal/10 pt-3">
          <div className="flex justify-between">
            <span className="text-mole/70">Subtotal</span>
            <span className="tabular-nums">
              {formatCurrency(Number(order.subtotal), locale)}
            </span>
          </div>
          {Number(order.tip) > 0 && (
            <div className="flex justify-between">
              <span className="text-mole/70">Tip</span>
              <span className="tabular-nums">
                {formatCurrency(Number(order.tip), locale)}
              </span>
            </div>
          )}
          <div className="flex justify-between font-bold pt-1">
            <span>Total</span>
            <span className="tabular-nums">
              {formatCurrency(Number(order.total), locale)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-mole/60">Payment status</span>
            <span className="uppercase">{order.payment_status}</span>
          </div>
        </div>
      </div>

      <OrderDetailActions
        orderId={order.id}
        canCancel={order.status === "pending"}
        items={order.items.map((it) => ({
          menu_item_id: it.menu_item_id,
          variant_id: it.variant_id ?? undefined,
          name_en: it.name_snapshot_en,
          name_es: it.name_snapshot_es ?? it.name_snapshot_en,
          variant_name_en: it.variant_snapshot ?? undefined,
          variant_name_es: it.variant_snapshot ?? undefined,
          quantity: Number(it.quantity),
          unit: it.unit,
          unit_price: Number(it.unit_price_snapshot),
        }))}
      />

      <div className="mt-6">
        <Button asChild variant="ghost">
          <Link href="/orders">Back to orders</Link>
        </Button>
      </div>
    </div>
  );
}
