"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/checkAdmin";
import type { NotificationType, Json } from "@/types/database";
import type { ActionResult } from "./orders";

export async function markRead(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const svc = createServiceRoleClient();
    const { error } = await svc
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/notifications");
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to mark read",
    };
  }
}

export async function markAllRead(): Promise<ActionResult> {
  try {
    const { userId } = await requireAdmin();
    const svc = createServiceRoleClient();
    const { error } = await svc
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_user_id", userId)
      .is("read_at", null);
    if (error) throw error;
    revalidatePath("/admin/notifications");
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to mark all read",
    };
  }
}

export interface SendOwnerNotificationInput {
  type: NotificationType;
  title: string;
  body?: string | null;
  metadata?: Json;
  recipient_user_id?: string;
}

/**
 * Writes a notification row for the current admin (or specified recipient).
 * TODO: wire push + email delivery. For now this only persists to DB —
 * the bell icon / notifications page will show it.
 */
export async function sendOwnerNotification(
  input: SendOwnerNotificationInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId } = await requireAdmin();
    const svc = createServiceRoleClient();
    const { data, error } = await svc
      .from("notifications")
      .insert({
        recipient_user_id: input.recipient_user_id ?? userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        metadata: (input.metadata ?? {}) as Json,
      })
      .select("id")
      .single();
    if (error) throw error;
    revalidatePath("/admin/notifications");
    revalidatePath("/admin");
    return { success: true, data: { id: data.id } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to send notification",
    };
  }
}
