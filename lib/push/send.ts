import "server-only";
import webpush from "web-push";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { PushSubscriptionRow } from "@/types/database";

let vapidConfigured = false;
function configureVapid(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export interface PushNotificationPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

interface SendResult {
  sent: number;
  removed: number;
  failed: number;
}

/** Send a Web Push notification to every admin/staff device that has
 *  registered a subscription. Silently no-ops if VAPID isn't configured (e.g.
 *  in a preview deploy that doesn't have the env vars set yet).
 */
export async function sendPushToOwners(
  payload: PushNotificationPayload,
): Promise<SendResult> {
  if (!configureVapid()) {
    return { sent: 0, removed: 0, failed: 0 };
  }

  const supabase = createServiceRoleClient();

  // Resolve the user_ids that have an admin or staff role.
  const { data: roleRows, error: roleErr } = await supabase
    .from("app_roles")
    .select("user_id, role")
    .in("role", ["admin", "staff"]);
  if (roleErr || !roleRows || roleRows.length === 0) {
    return { sent: 0, removed: 0, failed: 0 };
  }
  const adminIds = Array.from(
    new Set(roleRows.map((r: { user_id: string }) => r.user_id)),
  );

  const { data: subs, error: subsErr } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("user_id", adminIds);
  if (subsErr || !subs || subs.length === 0) {
    return { sent: 0, removed: 0, failed: 0 };
  }

  const body = JSON.stringify(payload);
  let sent = 0;
  let removed = 0;
  let failed = 0;
  const removeIds: string[] = [];

  await Promise.all(
    (subs as PushSubscriptionRow[]).map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          body,
        );
        sent += 1;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // 404 / 410 = endpoint gone forever. Reap.
        if (statusCode === 404 || statusCode === 410) {
          removeIds.push(row.id);
          removed += 1;
        } else {
          failed += 1;
          // eslint-disable-next-line no-console
          console.error("[push] send failed", row.endpoint.slice(0, 64), err);
        }
      }
    }),
  );

  if (removeIds.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("id", removeIds);
  }

  return { sent, removed, failed };
}
