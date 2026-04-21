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
import { Badge } from "@/components/ui/badge";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { OrderActions } from "./OrderActions";
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
        className="inline-flex items-center gap-1 text-sm text-nopal hover:underline"
      >
        <ArrowLeft className="h-3 w-3" /> Orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-mole">{order.order_number}</h1>
          <p className="text-sm text-mole/70">
            Created {format(new Date(order.created_at), "PPp")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="oro">{order.status}</Badge>
          <Badge variant="outline">{order.payment_status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: items + notes */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-nopal/10 text-left text-xs uppercase text-mole/60">
                    <th className="p-3">Item</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3 text-right">Unit</th>
                    <th className="p-3 text-right">Line</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id} className="border-b border-nopal/5">
                      <td className="p-3">
                        <div className="font-medium">{i.name_snapshot_en}</div>
                        {i.variant_snapshot ? (
                          <div className="text-xs text-mole/60">
                            {i.variant_snapshot}
                          </div>
                        ) : null}
                        {i.notes ? (
                          <div className="text-xs italic text-mole/60">
                            {i.notes}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-3 text-right">
                        {Number(i.quantity).toFixed(1)} {i.unit}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {fmtMoney(Number(i.unit_price_snapshot))}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {fmtMoney(Number(i.line_total))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="text-sm">
                    <td className="p-3" colSpan={3}>
                      Subtotal
                    </td>
                    <td className="p-3 text-right font-mono">
                      {fmtMoney(Number(order.subtotal))}
                    </td>
                  </tr>
                  {Number(order.tax) > 0 ? (
                    <tr className="text-sm">
                      <td className="p-3" colSpan={3}>
                        Tax
                      </td>
                      <td className="p-3 text-right font-mono">
                        {fmtMoney(Number(order.tax))}
                      </td>
                    </tr>
                  ) : null}
                  {Number(order.tip) > 0 ? (
                    <tr className="text-sm">
                      <td className="p-3" colSpan={3}>
                        Tip
                      </td>
                      <td className="p-3 text-right font-mono">
                        {fmtMoney(Number(order.tip))}
                      </td>
                    </tr>
                  ) : null}
                  <tr className="text-base font-semibold border-t border-nopal/10">
                    <td className="p-3" colSpan={3}>
                      Total
                    </td>
                    <td className="p-3 text-right font-mono">
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
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                {events.map((e, idx) => (
                  <li
                    key={`${e.label}-${idx}`}
                    className="flex items-center justify-between border-b border-nopal/5 pb-1 last:border-b-0"
                  >
                    <span className="text-mole/80">{e.label}</span>
                    <span className="font-mono text-xs text-mole/60">
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
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">
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
                <p className="text-mole/70">
                  {order.guest_email ?? customerProfile?.email}
                </p>
              ) : null}
              {order.customer_id ? (
                <p className="text-xs text-mole/50 font-mono">
                  user: {order.customer_id.slice(0, 8)}…
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pickup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">
                {format(new Date(`${order.pickup_date}T12:00:00`), "PPP")}
              </p>
              <p className="text-mole/70">
                Lbs reserved: {Number(order.total_lbs).toFixed(1)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                Total:{" "}
                <span className="font-mono">{fmtMoney(Number(order.total))}</span>
              </p>
              <p>
                Paid:{" "}
                <span className="font-mono">
                  {fmtMoney(Number(order.deposit_paid))}
                </span>
              </p>
              <p>
                Balance:{" "}
                <span className="font-mono">
                  {fmtMoney(Number(order.balance_remaining))}
                </span>
              </p>
              {order.payment_method ? (
                <p className="text-mole/70 text-xs">
                  Method: {order.payment_method}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
