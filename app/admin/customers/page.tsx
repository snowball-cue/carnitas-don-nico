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
    <div className="space-y-6">
      <h1 className="font-display text-3xl md:text-4xl text-mole">Customers</h1>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-nopal/10 text-left text-sm uppercase text-mole/60">
                <th className="p-4">Customer</th>
                <th className="p-4 text-right">Orders</th>
                <th className="p-4 text-right">Total lbs</th>
                <th className="p-4 text-right">Total spent</th>
                <th className="p-4">Last order</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-lg text-mole/60">
                    No customers yet.
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id} className="border-b border-nopal/5 hover:bg-papel/40">
                    <td className="p-4">
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="block group"
                      >
                        <div className="text-lg font-semibold text-mole group-hover:text-nopal">
                          {c.full_name ?? "—"}
                        </div>
                        <div className="text-sm text-mole/60">
                          {[c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </Link>
                    </td>
                    <td className="p-4 text-right tabular-nums">{c.order_count}</td>
                    <td className="p-4 text-right tabular-nums">
                      {c.total_lbs.toFixed(1)}
                    </td>
                    <td className="p-4 text-right font-display text-lg text-mole tabular-nums">
                      {fmtMoney(c.ltv)}
                    </td>
                    <td className="p-4">
                      {c.last_order_at
                        ? format(new Date(c.last_order_at), "MMM d, yyyy")
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
