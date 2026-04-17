import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Email-confirmation callback. Supabase's `confirmation_url` can be templated
 * to point here as `/auth/confirm?token_hash={{.TokenHash}}&type=email`.
 * Redirects to /welcome on success, /login?error=... on failure.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") as EmailOtpType | null) ?? "email";
  const next = url.searchParams.get("next") ?? "/welcome";

  if (!tokenHash) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "?error=missing_token";
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = `?error=${encodeURIComponent(error.message)}`;
    return NextResponse.redirect(redirectUrl);
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = next.startsWith("/") ? next : "/welcome";
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl);
}
