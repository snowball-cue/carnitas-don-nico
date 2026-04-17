import Link from "next/link";
import { redirect } from "next/navigation";
import { PackageOpen } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty/EmptyState";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { formatCurrency } from "@/lib/utils";
import type { OrderRow } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const db = await createServerSupabaseClient();
  const { data: authRes } = await db.auth.getUser();
  if (!authRes.user) {
    redirect("/auth/sign-in?next=/orders");
  }

  const { data } = await db
    .from("orders")
    .select("*")
    .eq("customer_id", authRes.user.id)
    .order("pickup_date", { ascending: false });

  const orders = (data as OrderRow[]) ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = orders.filter(
    (o) => o.pickup_date >= today && o.status !== "cancelled"
  );
  const past = orders.filter(
    (o) => !(o.pickup_date >= today && o.status !== "cancelled")
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-3xl md:text-4xl font-bold text-mole mb-6">
        Mis Pedidos / My Orders
      </h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={<PackageOpen className="h-8 w-8" />}
          title="No orders yet"
          description="Once you place an order, it'll show up here."
          cta={
            <Button asChild variant="oro">
              <Link href="/menu">Browse Menu</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-10">
          {upcoming.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-semibold text-mole mb-3">
                Próximos / Upcoming
              </h2>
              <ul className="space-y-3">
                {upcoming.map((o) => (
                  <OrderCard key={o.id} order={o} />
                ))}
              </ul>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-semibold text-mole mb-3">
                Anteriores / Past
              </h2>
              <ul className="space-y-3">
                {past.map((o) => (
                  <OrderCard key={o.id} order={o} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: OrderRow }) {
  const locale = "es-MX";
  const pickupLabel = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${order.pickup_date}T00:00:00`));

  return (
    <li className="rounded-lg border border-nopal/10 bg-papel-warm/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-display text-lg font-bold text-mole">
              {order.order_number}
            </p>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-mole/70 capitalize mt-1">
            Pickup: {pickupLabel}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold tabular-nums">
            {formatCurrency(Number(order.total), locale)}
          </p>
          <Link
            href={`/orders/${order.order_number}`}
            className="text-sm text-nopal underline mt-1 inline-block"
          >
            View details
          </Link>
        </div>
      </div>
    </li>
  );
}
