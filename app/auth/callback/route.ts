import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Supabase auth callback — handles:
 *  - magiclink / PKCE: `?code=...`
 *  - token-hash style magiclinks: `?token_hash=...&type=magiclink`
 *
 * Redirects to the `next` query param (or "/") on success,
 * or to /login?error=... on failure.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") ?? url.searchParams.get("redirect") ?? "/";

  const supabase = await createServerSupabaseClient();

  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as
          | "magiclink"
          | "recovery"
          | "invite"
          | "signup"
          | "email"
          | "email_change",
      });
      if (error) throw error;
    } else {
      // Nothing to exchange; fall through and redirect home.
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "callback_failed";
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = `?error=${encodeURIComponent(message)}`;
    return NextResponse.redirect(redirectUrl);
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = next.startsWith("/") ? next : "/";
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl);
}
