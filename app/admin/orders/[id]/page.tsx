import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { OrderActions } from "./OrderActions";
import { StatusPill, PaymentPill } from "../../_components/StatusPill";
import type { OrderItemRow, OrderRow } from "@/types/database";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const [orderRes, itemsRes] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("order_items")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!orderRes.data) return notFound();
  const order = orderRes.data as OrderRow;
  const items = (itemsRes.data ?? []) as OrderItemRow[];

  let customerProfile: {
    full_name: string | null;
    phone: string | null;
    email: string | null;
  } | null = null;
  if (order.customer_id) {
    const { data } = await supabase
      .from("customer_profiles")
      .select("full_name, phone, email")
      .eq("id", order.customer_id)
      .maybeSingle();
    customerProfile = data ?? null;
  }

  // Lightweight activity log from status timestamps
  const events: Array<{ label: string; ts: string | null }> = [
    { label: "Created", ts: order.created_at },
    { label: "Confirmed", ts: order.confirmed_at },
    { label: "Picked up", ts: order.picked_up_at },
    { label: "Cancelled", ts: order.cancelled_at },
  ].filter((e) => e.ts) as Array<{ label: string; ts: string }>;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1 text-base font-medium text-nopal hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-mole/60 font-mono">{order.order_number}</p>
          <h1 className="font-display text-3xl md:text-4xl text-mole">
            {order.guest_name ??
              customerProfile?.full_name ??
              "Registered customer"}
          </h1>
          <p className="text-base text-mole/70">
            Placed {format(new Date(order.created_at), "PPp")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={order.status} />
          <PaymentPill status={order.payment_status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: items + notes */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-2xl">Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-nopal/10 text-left text-sm uppercase text-mole/60">
                    <th className="p-4">Item</th>
                    <th className="p-4 text-right">Qty</th>
                    <th className="p-4 text-right">Unit</th>
                    <th className="p-4 text-right">Line</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id} className="border-b border-nopal/5">
                      <td className="p-4">
                        <div className="font-semibold text-mole">
                          {i.name_snapshot_en}
                        </div>
                        {i.variant_snapshot ? (
                          <div className="text-sm text-mole/70">
                            {i.variant_snapshot}
                          </div>
                        ) : null}
                        {i.notes ? (
                          <div className="text-sm italic text-mole/60">
                            {i.notes}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-4 text-right tabular-nums">
                        {Number(i.quantity).toFixed(1)} {i.unit}
                      </td>
                      <td className="p-4 text-right tabular-nums">
                        {fmtMoney(Number(i.unit_price_snapshot))}
                      </td>
                      <td className="p-4 text-right font-display text-lg text-mole tabular-nums">
                        {fmtMoney(Number(i.line_total))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="p-4 text-mole/70" colSpan={3}>
                      Subtotal
                    </td>
                    <td className="p-4 text-right tabular-nums">
                      {fmtMoney(Number(order.subtotal))}
                    </td>
                  </tr>
                  {Number(order.tax) > 0 ? (
                    <tr>
                      <td className="p-4 text-mole/70" colSpan={3}>
                        Tax
                      </td>
                      <td className="p-4 text-right tabular-nums">
                        {fmtMoney(Number(order.tax))}
                      </td>
                    </tr>
                  ) : null}
                  {Number(order.tip) > 0 ? (
                    <tr>
                      <td className="p-4 text-mole/70" colSpan={3}>
                        Tip
                      </td>
                      <td className="p-4 text-right tabular-nums">
                        {fmtMoney(Number(order.tip))}
                      </td>
                    </tr>
                  ) : null}
                  <tr className="border-t-2 border-nopal/15">
                    <td className="p-4 font-display text-xl text-mole" colSpan={3}>
                      Total
                    </td>
                    <td className="p-4 text-right font-display text-2xl text-mole tabular-nums">
                      {fmtMoney(Number(order.total))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          <OrderActions
            orderId={order.id}
            orderNumber={order.order_number}
            initialNotes={order.notes ?? ""}
            status={order.status}
            depositPaid={Number(order.deposit_paid)}
            total={Number(order.total)}
          />

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-2xl">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-base">
                {events.map((e, idx) => (
                  <li
                    key={`${e.label}-${idx}`}
                    className="flex items-center justify-between border-b border-nopal/5 pb-2 last:border-b-0"
                  >
                    <span className="font-medium text-mole">{e.label}</span>
                    <span className="text-mole/60">
                      {format(new Date(e.ts as string), "PPp")}
                    </span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Right column: customer + pickup */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-2xl">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-base">
              <p className="text-lg font-semibold text-mole">
                {order.guest_name ??
                  customerProfile?.full_name ??
                  "Registered customer"}
              </p>
              {(order.guest_phone ?? customerProfile?.phone) ? (
                <p className="text-mole/70">
                  {order.guest_phone ?? customerProfile?.phone}
                </p>
              ) : null}
              {(order.guest_email ?? customerProfile?.email) ? (
                <p className="text-mole/70 break-all">
                  {order.guest_email ?? customerProfile?.email}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-2xl">Pickup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-base">
              <p className="text-lg font-semibold text-mole">
                {format(new Date(`${order.pickup_date}T12:00:00`), "PPP")}
              </p>
              <p className="text-mole/70">
                Lbs reserved: {Number(order.total_lbs).toFixed(1)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-2xl">Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-base">
              <div className="flex justify-between">
                <span className="text-mole/70">Total</span>
                <span className="font-display text-mole tabular-nums">
                  {fmtMoney(Number(order.total))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-mole/70">Paid</span>
                <span className="font-display text-nopal tabular-nums">
                  {fmtMoney(Number(order.deposit_paid))}
                </span>
              </div>
              <div className="flex justify-between border-t border-nopal/10 pt-2">
                <span className="text-mole/70">Balance</span>
                <span className="font-display text-lg text-chile tabular-nums">
                  {fmtMoney(Number(order.balance_remaining))}
                </span>
              </div>
              {order.payment_method ? (
                <p className="text-mole/60 text-sm pt-1">
                  Paid via {order.payment_method}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
