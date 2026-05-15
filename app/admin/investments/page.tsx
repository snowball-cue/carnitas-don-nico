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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl md:text-4xl text-mole">Investments</h1>
        <InvestmentsClient />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-mole/70 font-medium">
            Total invested
          </CardTitle>
        </CardHeader>
        <CardContent className="font-display text-4xl text-mole tabular-nums">
          {fmtMoney(total)}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-nopal/10 text-left text-sm uppercase text-mole/60">
                <th className="p-4">Item</th>
                <th className="p-4">Category</th>
                <th className="p-4">Purchased</th>
                <th className="p-4 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-lg text-mole/60">
                    No investments yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-nopal/5">
                    <td className="p-4">
                      <div className="font-semibold text-mole">{r.item_name}</div>
                      {r.notes ? (
                        <div className="text-sm text-mole/60">{r.notes}</div>
                      ) : null}
                    </td>
                    <td className="p-4 text-mole/70">
                      {r.category ?? "—"}
                    </td>
                    <td className="p-4">
                      {format(new Date(`${r.purchase_date}T12:00:00`), "MMM d, yyyy")}
                    </td>
                    <td className="p-4 text-right font-display text-lg text-mole tabular-nums">
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
