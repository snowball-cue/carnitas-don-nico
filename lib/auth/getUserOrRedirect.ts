import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Server helper: returns the signed-in user or redirects to /login?redirect=...
 * Call only from Server Components / Route Handlers / Server Actions.
 */
export async function getUserOrRedirect(redirectPath?: string): Promise<User> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const qs = redirectPath
      ? `?redirect=${encodeURIComponent(redirectPath)}`
      : "";
    redirect(`/login${qs}`);
  }
  return user;
}

/**
 * Non-redirecting variant. Returns null if unauthenticated.
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}
