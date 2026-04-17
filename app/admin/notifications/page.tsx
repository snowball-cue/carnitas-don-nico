import { format } from "date-fns";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkAllReadButton, MarkReadInline } from "./NotificationsClient";
import type { NotificationRow } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_user_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as NotificationRow[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-mole">Notifications</h1>
        <MarkAllReadButton />
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-mole/60">
            No notifications yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((n) => (
            <Card key={n.id} className={n.read_at ? "opacity-70" : ""}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{n.type}</Badge>
                    {!n.read_at ? (
                      <Badge variant="oro" shape="pill">
                        new
                      </Badge>
                    ) : null}
                    <span className="text-xs text-mole/50">
                      {format(new Date(n.created_at), "PPp")}
                    </span>
                  </div>
                  <p className="font-medium text-mole mt-1">{n.title}</p>
                  {n.body ? (
                    <p className="text-sm text-mole/70">{n.body}</p>
                  ) : null}
                </div>
                {!n.read_at ? <MarkReadInline id={n.id} /> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
