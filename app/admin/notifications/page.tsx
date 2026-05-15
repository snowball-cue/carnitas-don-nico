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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl md:text-4xl text-mole">
          Notifications
        </h1>
        <MarkAllReadButton />
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-lg text-mole/60">
            All caught up.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((n) => (
            <Card key={n.id} className={n.read_at ? "opacity-60" : ""}>
              <CardContent className="p-5 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="px-3 py-1 text-sm">
                      {n.type}
                    </Badge>
                    {!n.read_at ? (
                      <Badge variant="oro" shape="pill" className="px-3 py-1 text-sm">
                        new
                      </Badge>
                    ) : null}
                    <span className="text-sm text-mole/50">
                      {format(new Date(n.created_at), "PPp")}
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-mole mt-2">
                    {n.title}
                  </p>
                  {n.body ? (
                    <p className="text-base text-mole/70 mt-1">{n.body}</p>
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
