import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CateringRequestRow, CateringStatus } from "@/types/database";
import { AdminCateringTitle } from "./AdminCateringTitle";

export const dynamic = "force-dynamic";

function refFromId(id: string): string {
  return `CAT-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

function statusVariant(
  s: CateringStatus,
): "default" | "oro" | "outline" | "sale" {
  if (s === "new") return "outline";
  if (s === "contacted" || s === "quoted") return "oro";
  if (s === "confirmed" || s === "completed") return "default";
  if (s === "cancelled") return "sale";
  return "default";
}

export default async function AdminCateringPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("catering_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data as CateringRequestRow[] | null) ?? [];

  return (
    <div className="space-y-6">
      <AdminCateringTitle />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-nopal/10 bg-papel text-left text-sm uppercase tracking-wide text-mole/60">
                  <th className="p-4">Customer</th>
                  <th className="p-4">Event date</th>
                  <th className="p-4 text-right">Guests</th>
                  <th className="p-4 text-right">Est. lbs</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-lg text-mole/60">
                      No catering requests yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-nopal/5 hover:bg-papel/40"
                    >
                      <td className="p-4">
                        <Link
                          href={`/admin/catering/${r.id}`}
                          className="block group"
                        >
                          <div className="text-lg font-semibold text-mole group-hover:text-nopal">
                            {r.full_name}
                          </div>
                          <div className="text-sm text-mole/60">
                            {refFromId(r.id)} · {r.phone}
                          </div>
                        </Link>
                      </td>
                      <td className="p-4">
                        {format(new Date(`${r.event_date}T12:00:00`), "EEE, MMM d, yyyy")}
                      </td>
                      <td className="p-4 text-right tabular-nums">{r.guest_count}</td>
                      <td className="p-4 text-right tabular-nums">
                        {Number(r.estimated_lbs).toFixed(1)}
                      </td>
                      <td className="p-4">
                        <Badge variant={statusVariant(r.status)} className="px-3 py-1 text-sm">
                          {r.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-mole/60">
                        {format(new Date(r.created_at), "MMM d, h:mm a")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
