import Link from "next/link";
import { format } from "date-fns";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import type { CustomerProfileRow, OrderRow } from "@/types/database";

export const dynamic = "force-dynamic";

interface CustomerWithStats extends CustomerProfileRow {
  ltv: number;
  total_lbs: number;
  last_order_at: string | null;
  order_count: number;
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export default async function AdminCustomersPage() {
  const supabase = await createServerSupabaseClient();

  // Load all customer profiles and their orders in parallel; aggregate in JS.
  // This scales to a few thousand — plenty for a single-location pop-up.
  const [profilesRes, ordersRes] = await Promise.all([
    supabase
      .from("customer_profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("orders")
      .select("customer_id, total, total_lbs, created_at, status")
      .not("customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  const profiles = (profilesRes.data ?? []) as CustomerProfileRow[];
  const orders = (ordersRes.data ?? []) as Pick<
    OrderRow,
    "customer_id" | "total" | "total_lbs" | "created_at" | "status"
  >[];

  const stats = new Map<
    string,
    { ltv: number; lbs: number; lastAt: string | null; count: number }
  >();
  orders.forEach((o) => {
    if (!o.customer_id) return;
    if (["cancelled", "no_show"].includes(o.status as string)) return;
    const cur = stats.get(o.customer_id) ?? {
      ltv: 0,
      lbs: 0,
      lastAt: null,
      count: 0,
    };
    cur.ltv += Number(o.total ?? 0);
    cur.lbs += Number(o.total_lbs ?? 0);
    cur.count += 1;
    if (!cur.lastAt || o.created_at > cur.lastAt) cur.lastAt = o.created_at;
    stats.set(o.customer_id, cur);
  });

  const rows: CustomerWithStats[] = profiles
    .map((p) => {
      const s = stats.get(p.id);
      return {
        ...p,
        ltv: s?.ltv ?? 0,
        total_lbs: s?.lbs ?? Number(p.total_lbs_purchased ?? 0),
        last_order_at: s?.lastAt ?? null,
        order_count: s?.count ?? 0,
      };
    })
    .sort((a, b) => b.ltv - a.ltv);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-mole">Customers</h1>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-nopal/10 text-left text-xs uppercase text-mole/60">
                <th className="p-3">Name</th>
                <th className="p-3">Contact</th>
                <th className="p-3 text-right">Orders</th>
                <th className="p-3 text-right">Total lbs</th>
                <th className="p-3 text-right">LTV</th>
                <th className="p-3">Last order</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-mole/60">
                    No customers yet.
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id} className="border-b border-nopal/5">
                    <td className="p-3">
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="text-nopal hover:underline font-medium"
                      >
                        {c.full_name ?? "—"}
                      </Link>
                      <div className="text-xs text-mole/50 font-mono">
                        {c.referral_code}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-xs text-mole/70">
                        {c.email ?? "—"}
                      </div>
                      <div className="text-xs text-mole/70">
                        {c.phone ?? ""}
                      </div>
                    </td>
                    <td className="p-3 text-right">{c.order_count}</td>
                    <td className="p-3 text-right">
                      {c.total_lbs.toFixed(1)}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {fmtMoney(c.ltv)}
                    </td>
                    <td className="p-3">
                      {c.last_order_at
                        ? format(new Date(c.last_order_at), "MMM d")
                        : "—"}
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
