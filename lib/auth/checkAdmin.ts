/**
 * Server-only helpers for checking admin / staff role.
 *
 * These hit the `app_roles` table via the service-role client so they can be
 * called from inside server actions without RLS recursion (service role bypass
 * means we can safely check a user id that may not match auth.uid()).
 */

import "server-only";
import { createServiceRoleClient, createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Returns true if the given user id has an `admin` or `staff` app_role.
 * Uses the service-role client so it works outside of an RLS-bound session.
 */
export async function isAdminFn(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    const svc = createServiceRoleClient();
    const { data, error } = await svc
      .from("app_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) return false;
    return (data ?? []).some((r) => r.role === "admin" || r.role === "staff");
  } catch {
    return false;
  }
}

/**
 * Gets the currently-authenticated user and asserts they are admin/staff.
 * Throws on failure. Server-action / RSC use.
 */
export async function requireAdmin(): Promise<{ userId: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const ok = await isAdminFn(user.id);
  if (!ok) throw new Error("Unauthorized");
  return { userId: user.id };
}
