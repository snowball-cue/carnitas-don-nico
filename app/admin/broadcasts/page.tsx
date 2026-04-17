import Link from "next/link";
import { format } from "date-fns";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/checkAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import type {
  BroadcastCampaignRow,
  BroadcastStatus,
} from "@/types/database";

export const dynamic = "force-dynamic";

function statusVariant(
  s: BroadcastStatus,
): "default" | "oro" | "outline" | "sale" {
  switch (s) {
    case "sent":
      return "default";
    case "sending":
      return "oro";
    case "draft":
      return "outline";
    case "failed":
    case "cancelled":
      return "sale";
    default:
      return "outline";
  }
}

export default async function AdminBroadcastsPage() {
  await requireAdmin();
  const svc = createServiceRoleClient();
  const { data } = await svc
    .from("broadcast_campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data as BroadcastCampaignRow[] | null) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-mole">Broadcasts</h1>
          <p className="text-sm text-mole/60">Send email to your customers</p>
        </div>
        <Link href="/admin/broadcasts/new">
          <Button>
            <Plus className="h-4 w-4" />
            New broadcast
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-nopal/10 text-left text-xs uppercase tracking-wide text-mole/60">
                <th className="p-3">Subject</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Recipients</th>
                <th className="p-3 text-right">Delivered</th>
                <th className="p-3 text-right">Failed</th>
                <th className="p-3">Sent</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-mole/60">
                    No broadcasts yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-nopal/5 hover:bg-papel/40"
                  >
                    <td className="p-3">
                      <Link
                        href={`/admin/broadcasts/${r.id}`}
                        className="text-nopal hover:underline font-medium"
                      >
                        {r.subject}
                      </Link>
                      <div className="text-xs text-mole/50">
                        {r.locale.toUpperCase()}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant={statusVariant(r.status)}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">{r.total_recipients}</td>
                    <td className="p-3 text-right">{r.delivered_count}</td>
                    <td className="p-3 text-right">{r.failed_count}</td>
                    <td className="p-3 text-xs text-mole/60">
                      {r.finished_at
                        ? format(new Date(r.finished_at), "MMM d, HH:mm")
                        : r.started_at
                          ? format(new Date(r.started_at), "MMM d, HH:mm")
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
