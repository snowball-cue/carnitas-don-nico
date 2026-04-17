import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/checkAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import type {
  BroadcastCampaignRow,
  BroadcastRecipientRow,
} from "@/types/database";

export const dynamic = "force-dynamic";

function statusColor(s: string): "default" | "oro" | "outline" | "sale" {
  if (s === "sent") return "default";
  if (s === "pending") return "outline";
  if (s === "failed") return "sale";
  if (s === "skipped_unsubscribed" || s === "skipped_test_mode") return "oro";
  return "outline";
}

export default async function AdminBroadcastDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();

  const svc = createServiceRoleClient();
  const [campaignRes, recipientsRes] = await Promise.all([
    svc
      .from("broadcast_campaigns")
      .select("*")
      .eq("id", id)
      .maybeSingle(),
    svc
      .from("broadcast_recipients")
      .select("*")
      .eq("campaign_id", id)
      .order("sent_at", { ascending: false })
      .limit(500),
  ]);
  const campaign = campaignRes.data as BroadcastCampaignRow | null;
  if (!campaign) notFound();
  const recipients =
    (recipientsRes.data as BroadcastRecipientRow[] | null) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/admin/broadcasts">
          <Button variant="ghost" size="icon" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl text-mole truncate">
            {campaign.subject}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline">{campaign.locale.toUpperCase()}</Badge>
            <Badge>{campaign.status}</Badge>
            <span className="text-xs text-mole/60">
              Created {format(new Date(campaign.created_at), "PPp")}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Recipients" value={campaign.total_recipients} />
        <StatCard
          label="Delivered"
          value={campaign.delivered_count}
          hint="sent"
        />
        <StatCard label="Failed" value={campaign.failed_count} hint="failed" />
        <StatCard
          label="Skipped"
          value={
            campaign.total_recipients -
            campaign.delivered_count -
            campaign.failed_count
          }
          hint="unsubscribed / test"
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <h2 className="font-display text-lg text-mole mb-2">Preview</h2>
          <div
            className="prose prose-sm max-w-none text-mole"
            dangerouslySetInnerHTML={{ __html: campaign.body_html }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-nopal/10 text-left text-xs uppercase tracking-wide text-mole/60">
                <th className="p-3">Recipient</th>
                <th className="p-3">Status</th>
                <th className="p-3">Sent</th>
                <th className="p-3">Error</th>
              </tr>
            </thead>
            <tbody>
              {recipients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-mole/60">
                    No recipients.
                  </td>
                </tr>
              ) : (
                recipients.map((r) => (
                  <tr key={r.id} className="border-b border-nopal/5">
                    <td className="p-3">
                      <div className="font-medium">{r.name ?? "—"}</div>
                      <div className="text-xs text-mole/60">{r.email}</div>
                    </td>
                    <td className="p-3">
                      <Badge variant={statusColor(r.status)}>{r.status}</Badge>
                    </td>
                    <td className="p-3 text-xs text-mole/60">
                      {r.sent_at
                        ? format(new Date(r.sent_at), "MMM d HH:mm:ss")
                        : "—"}
                    </td>
                    <td className="p-3 text-xs text-chile">{r.error ?? ""}</td>
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

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-mole/60">
          {label}
        </div>
        <div className="text-2xl font-display text-mole mt-1">{value}</div>
        {hint ? <div className="text-xs text-mole/50 mt-0.5">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}
