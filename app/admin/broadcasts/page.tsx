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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-mole">
            Messages
          </h1>
          <p className="text-base text-mole/60">Send email to your customers</p>
        </div>
        <Link href="/admin/broadcasts/new">
          <Button size="lg">
            <Plus className="h-5 w-5" />
            New message
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-nopal/10 text-left text-sm uppercase tracking-wide text-mole/60">
                <th className="p-4">Subject</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Recipients</th>
                <th className="p-4 text-right">Delivered</th>
                <th className="p-4 text-right">Failed</th>
                <th className="p-4">Sent</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-lg text-mole/60">
                    No messages yet.
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
                        href={`/admin/broadcasts/${r.id}`}
                        className="block group"
                      >
                        <div className="text-lg font-semibold text-mole group-hover:text-nopal">
                          {r.subject}
                        </div>
                        <div className="text-sm text-mole/50">
                          {r.locale.toUpperCase()}
                        </div>
                      </Link>
                    </td>
                    <td className="p-4">
                      <Badge variant={statusVariant(r.status)} className="px-3 py-1 text-sm">
                        {r.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right tabular-nums">
                      {r.total_recipients}
                    </td>
                    <td className="p-4 text-right tabular-nums">
                      {r.delivered_count}
                    </td>
                    <td className="p-4 text-right tabular-nums">
                      {r.failed_count}
                    </td>
                    <td className="p-4 text-sm text-mole/60">
                      {r.finished_at
                        ? format(new Date(r.finished_at), "MMM d, h:mm a")
                        : r.started_at
                          ? format(new Date(r.started_at), "MMM d, h:mm a")
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
