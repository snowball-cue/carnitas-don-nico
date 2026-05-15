"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendPushToOwners } from "@/lib/push/send";

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}

export async function registerPushSubscription(
  input: PushSubscriptionInput,
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not signed in" };
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        user_agent: input.userAgent ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,endpoint" },
    );
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function unregisterPushSubscription(
  endpoint: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not signed in" };
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Owner-only: send a test push to verify the setup works end-to-end. */
export async function sendPushTest(): Promise<
  { success: true; sent: number } | { success: false; error: string }
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in" };

  const { data: roles } = await supabase
    .from("app_roles")
    .select("role")
    .eq("user_id", user.id);
  const isAdmin = (roles ?? []).some(
    (r: { role: string }) => r.role === "admin" || r.role === "staff",
  );
  if (!isAdmin) return { success: false, error: "Not authorized" };

  const result = await sendPushToOwners({
    title: "Test notification",
    body: "If you see this, push notifications are working.",
    url: "/admin",
    tag: "push-test",
  });
  return { success: true, sent: result.sent };
}
