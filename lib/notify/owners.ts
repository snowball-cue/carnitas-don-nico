import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendPushToOwners } from "@/lib/push/send";
import type { Json, NotificationType } from "@/types/database";

interface NotifyOwnersInput {
  type: NotificationType;
  title: string;
  body?: string | null;
  metadata?: Json;
  /** Path to navigate to when the push is tapped. Defaults to /admin/orders. */
  pushUrl?: string;
  /** Notification tag — pushes with the same tag collapse on the device. */
  tag?: string;
}

/**
 * Fan-out an owner-facing event to every admin/staff:
 *   1. Insert one row per admin into the `notifications` inbox table.
 *   2. Send a Web Push to every device they've registered.
 *
 * Safe to call from any server context — uses the service-role client so it
 * doesn't depend on an authenticated session (callers may be guest orders).
 * Errors are swallowed/logged so the originating action (e.g. createOrder)
 * never fails because notification delivery hiccupped.
 */
export async function notifyOwners(input: NotifyOwnersInput): Promise<void> {
  try {
    const svc = createServiceRoleClient();
    const { data: roles, error: rolesErr } = await svc
      .from("app_roles")
      .select("user_id, role")
      .in("role", ["admin", "staff"]);
    if (rolesErr) {
      console.error("[notifyOwners] failed to load roles", rolesErr);
      return;
    }
    const userIds = Array.from(
      new Set(
        (roles ?? []).map((r: { user_id: string }) => r.user_id),
      ),
    );

    if (userIds.length > 0) {
      const rows = userIds.map((uid) => ({
        recipient_user_id: uid,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        metadata: (input.metadata ?? {}) as Json,
      }));
      const { error: insertErr } = await svc
        .from("notifications")
        .insert(rows);
      if (insertErr) {
        console.error("[notifyOwners] failed to insert", insertErr);
      }
    }

    await sendPushToOwners({
      title: input.title,
      body: input.body ?? undefined,
      url: input.pushUrl ?? "/admin/orders",
      tag: input.tag ?? input.type,
      data: input.metadata as Record<string, unknown> | undefined,
    });
  } catch (err) {
    console.error("[notifyOwners] unexpected failure", err);
  }
}
