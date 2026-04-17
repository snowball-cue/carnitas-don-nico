import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CustomerProfileRow, OrderRow } from "@/types/database";

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

export default async function AdminCustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const [profRes, ordersRes] = await Promise.all([
    supabase.from("customer_profiles").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("orders")
      .select("id, order_number, total, total_lbs, status, created_at, pickup_date")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!profRes.data) return notFound();
  const profile = profRes.data as CustomerProfileRow;
  const orders = (ordersRes.data ?? []) as Pick<
    OrderRow,
    "id" | "order_number" | "total" | "total_lbs" | "status" | "created_at" | "pickup_date"
  >[];
  const ltv = orders
    .filter((o) => !["cancelled", "no_show"].includes(o.status as string))
    .reduce((a, o) => a + Number(o.total ?? 0), 0);

  return (
    <div className="space-y-4">
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-1 text-sm text-nopal hover:underline"
      >
        <ArrowLeft className="h-3 w-3" /> Customers
      </Link>

      <div>
        <h1 className="font-display text-2xl text-mole">
          {profile.full_name ?? "—"}
        </h1>
        <p className="text-sm text-mole/60 font-mono">{profile.referral_code}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-mole/70">LTV</CardTitle>
          </CardHeader>
          <CardContent className="font-display text-2xl text-mole">
            {fmtMoney(ltv)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-mole/70">Total lbs</CardTitle>
          </CardHeader>
          <CardContent className="font-display text-2xl text-mole">
            {Number(profile.total_lbs_purchased).toFixed(1)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-mole/70">Loyalty</CardTitle>
          </CardHeader>
          <CardContent className="font-display text-2xl text-mole">
            {profile.loyalty_points}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>{profile.email ?? "—"}</p>
          <p>{profile.phone ?? "—"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Orders ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-nopal/10 text-left text-xs uppercase text-mole/60">
                <th className="p-3">Order</th>
                <th className="p-3">Pickup</th>
                <th className="p-3 text-right">Lbs</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-mole/60">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="border-b border-nopal/5">
                    <td className="p-3 font-mono">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="text-nopal hover:underline"
                      >
                        {o.order_number}
                      </Link>
                    </td>
                    <td className="p-3">
                      {format(new Date(`${o.pickup_date}T12:00:00`), "MMM d")}
                    </td>
                    <td className="p-3 text-right">
                      {Number(o.total_lbs).toFixed(1)}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {fmtMoney(Number(o.total))}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">{o.status}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
