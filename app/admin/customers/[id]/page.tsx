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
    <div className="space-y-6">
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-1 text-base font-medium text-nopal hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to customers
      </Link>

      <div>
        <h1 className="font-display text-3xl md:text-4xl text-mole">
          {profile.full_name ?? "—"}
        </h1>
        <p className="text-sm text-mole/60 font-mono">{profile.referral_code}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-base text-mole/70 font-medium">
              Total spent
            </CardTitle>
          </CardHeader>
          <CardContent className="font-display text-3xl text-mole tabular-nums">
            {fmtMoney(ltv)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-base text-mole/70 font-medium">
              Total lbs
            </CardTitle>
          </CardHeader>
          <CardContent className="font-display text-3xl text-mole tabular-nums">
            {Number(profile.total_lbs_purchased).toFixed(1)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-base text-mole/70 font-medium">
              Loyalty points
            </CardTitle>
          </CardHeader>
          <CardContent className="font-display text-3xl text-mole tabular-nums">
            {profile.loyalty_points}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">Contact</CardTitle>
        </CardHeader>
        <CardContent className="text-base space-y-1">
          <p>{profile.email ?? "—"}</p>
          <p>{profile.phone ?? "—"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            Orders ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-nopal/10 text-left text-sm uppercase text-mole/60">
                <th className="p-4">Order</th>
                <th className="p-4">Pickup</th>
                <th className="p-4 text-right">Lbs</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-lg text-mole/60">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="border-b border-nopal/5 hover:bg-papel/40">
                    <td className="p-4">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="font-mono text-nopal hover:underline"
                      >
                        {o.order_number}
                      </Link>
                    </td>
                    <td className="p-4">
                      {format(new Date(`${o.pickup_date}T12:00:00`), "MMM d, yyyy")}
                    </td>
                    <td className="p-4 text-right tabular-nums">
                      {Number(o.total_lbs).toFixed(1)}
                    </td>
                    <td className="p-4 text-right font-display text-lg text-mole tabular-nums">
                      {fmtMoney(Number(o.total))}
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="px-3 py-1 text-sm">
                        {o.status}
                      </Badge>
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
