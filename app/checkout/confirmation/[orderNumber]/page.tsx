import { notFound } from "next/navigation";
import Link from "next/link";
import {
  PapelPicadoTop,
  PapelPicadoBottom,
} from "@/components/brand/PapelPicado";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { ConfirmationActions } from "./ConfirmationActions";
import { getOrder, trackGuestOrder } from "@/app/actions/orders";
import { formatCurrency, formatLbs } from "@/lib/utils";
import type { OrderWithDetails } from "@/app/actions/orders";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ guest?: string; phone?: string }>;
}

export default async function ConfirmationPage({
  params,
  searchParams,
}: PageProps) {
  const { orderNumber } = await params;
  const sp = await searchParams;
  const isGuest = sp.guest === "1";

  let order: OrderWithDetails | null = null;
  if (isGuest && sp.phone) {
    const r = await trackGuestOrder(orderNumber, sp.phone);
    if (r.success && r.data) order = r.data;
  } else {
    const r = await getOrder(orderNumber);
    if (r.success && r.data) order = r.data;
  }

  if (!order) notFound();

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const trackUrl = isGuest
    ? `${APP_URL}/orders/track/${orderNumber}${sp.phone ? `?phone=${encodeURIComponent(sp.phone)}` : ""}`
    : `${APP_URL}/orders/${orderNumber}`;

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
    <div className="bg-papel">
      <PapelPicadoTop height={40} />

      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-mole">
          ¡Pedido confirmado!
          <span className="block text-oro text-xl md:text-2xl mt-1">
            Order confirmed!
          </span>
        </h1>

        {/* Lotería-card style order number */}
        <div className="mt-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 -rotate-3 rounded-xl bg-oro shadow-lg" />
            <div className="relative -rotate-3 rounded-xl border-4 border-oro bg-nopal px-10 py-6 shadow">
              <p className="text-[10px] uppercase tracking-widest text-oro/90">
                Order Number
              </p>
              <p className="font-display text-4xl md:text-5xl font-bold text-oro">
                {order.order_number}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-mole/80">
          Muestra este número al recoger · Show this number at pickup.
        </p>

        {isGuest && (
          <p className="mt-2 text-sm text-mole/60">
            Guarda esta página — también te enviaremos el enlace por SMS.
            <br />
            Save this page — we&apos;ll also SMS you the link.
          </p>
        )}
      </div>

      {/* Summary card */}
      <div className="mx-auto max-w-3xl px-4 pb-10">
        <div className="rounded-lg border border-nopal/10 bg-papel-warm p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-mole">
              Resumen / Summary
            </h2>
            <OrderStatusBadge status={order.status} />
          </div>

          <div className="mt-4 space-y-2">
            <div className="text-sm">
              <span className="text-mole/70">Pickup: </span>
              <span className="font-medium capitalize">{pickupLabel}</span>
              {pickupTimeLabel && (
                <span className="text-mole/70"> · {pickupTimeLabel}</span>
              )}
            </div>
          </div>

          <ul className="mt-4 divide-y divide-nopal/10 text-sm">
            {order.items.map((it) => (
              <li key={it.id} className="flex justify-between py-2">
                <span className="min-w-0">
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

          <div className="mt-4 space-y-1 text-sm border-t border-nopal/10 pt-3">
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
            <div className="flex justify-between font-bold text-base pt-1">
              <span>Total</span>
              <span className="tabular-nums">
                {formatCurrency(Number(order.total), locale)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-mole/60">Deposit paid</span>
              <span className="tabular-nums">
                {formatCurrency(Number(order.deposit_paid), locale)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-mole/60">Balance remaining</span>
              <span className="tabular-nums">
                {formatCurrency(Number(order.balance_remaining), locale)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-mole/60">Payment status</span>
              <span className="uppercase">{order.payment_status}</span>
            </div>
          </div>
        </div>

        {/* QR + action buttons */}
        <ConfirmationActions
          orderNumber={order.order_number}
          trackUrl={trackUrl}
        />

        {/* Pickup instructions */}
        <div className="mt-8 rounded-lg border border-nopal/10 bg-papel-warm/50 p-5">
          <h3 className="font-display text-lg font-semibold text-mole">
            Instrucciones de recogida / Pickup instructions
          </h3>
          <div className="mt-3 grid gap-4 text-sm md:grid-cols-2">
            <div>
              <p className="font-medium text-mole">Español</p>
              <ul className="list-disc pl-5 mt-1 space-y-1 text-mole/80">
                <li>Trae tu número de pedido.</li>
                <li>Estaciónate frente al cazo.</li>
                <li>Paga el balance restante en persona si aplica.</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-mole">English</p>
              <ul className="list-disc pl-5 mt-1 space-y-1 text-mole/80">
                <li>Bring your order number.</li>
                <li>Park in front of the cazo.</li>
                <li>Pay any remaining balance at pickup if applicable.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/menu">Order more</Link>
          </Button>
          {!isGuest && (
            <Button asChild variant="ghost">
              <Link href="/orders">My Orders</Link>
            </Button>
          )}
        </div>
      </div>

      <PapelPicadoBottom height={36} />
    </div>
  );
}
