import { format } from "date-fns";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvestmentsClient } from "./InvestmentsClient";
import type { InvestmentRow } from "@/types/database";

export const dynamic = "force-dynamic";

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export default async function AdminInvestmentsPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("investments")
    .select("*")
    .order("purchase_date", { ascending: false });
  const rows = (data ?? []) as InvestmentRow[];
  const total = rows.reduce((a, r) => a + Number(r.cost), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-mole">Investments</h1>
        <InvestmentsClient />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-mole/70">Total invested</CardTitle>
        </CardHeader>
        <CardContent className="font-display text-3xl text-mole">
          {fmtMoney(total)}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-nopal/10 text-left text-xs uppercase text-mole/60">
                <th className="p-3">Item</th>
                <th className="p-3">Category</th>
                <th className="p-3">Purchased</th>
                <th className="p-3 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-mole/60">
                    No investments yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-nopal/5">
                    <td className="p-3">
                      <div className="font-medium">{r.item_name}</div>
                      {r.notes ? (
                        <div className="text-xs text-mole/60">{r.notes}</div>
                      ) : null}
                    </td>
                    <td className="p-3 text-xs font-mono text-mole/70">
                      {r.category ?? "—"}
                    </td>
                    <td className="p-3">
                      {format(new Date(`${r.purchase_date}T12:00:00`), "MMM d, yyyy")}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {fmtMoney(Number(r.cost))}
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
