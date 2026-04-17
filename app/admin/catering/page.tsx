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
    <div className="space-y-4">
      <AdminCateringTitle />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-nopal/10 bg-papel text-left text-xs uppercase tracking-wide text-mole/60">
                  <th className="p-3">Ref</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Event date</th>
                  <th className="p-3 text-right">Guests</th>
                  <th className="p-3 text-right">Est. lbs</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-mole/60">
                      No catering requests yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-nopal/5 hover:bg-papel/40"
                    >
                      <td className="p-3 font-mono">
                        <Link
                          href={`/admin/catering/${r.id}`}
                          className="text-nopal hover:underline"
                        >
                          {refFromId(r.id)}
                        </Link>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{r.full_name}</div>
                        <div className="text-xs text-mole/60">{r.phone}</div>
                      </td>
                      <td className="p-3">
                        {format(new Date(`${r.event_date}T12:00:00`), "MMM d, yyyy")}
                      </td>
                      <td className="p-3 text-right">{r.guest_count}</td>
                      <td className="p-3 text-right">
                        {Number(r.estimated_lbs).toFixed(1)}
                      </td>
                      <td className="p-3">
                        <Badge variant={statusVariant(r.status)}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs text-mole/60">
                        {format(new Date(r.created_at), "MMM d, HH:mm")}
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
