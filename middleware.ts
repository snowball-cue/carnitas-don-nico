import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Middleware: refreshes the Supabase auth session and enforces route guards.
 *
 * - /admin/**   → requires signed-in user with admin or staff role
 * - /account/** → requires signed-in user
 * - everything else → public
 */
export async function middleware(request: NextRequest) {
  const { response, supabase } = await updateSession(request);

  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isAccountRoute = pathname.startsWith("/account");

  if (!isAdminRoute && !isAccountRoute) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminRoute) {
    const { data: roles } = await supabase
      .from("app_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdminOrStaff = (roles ?? []).some(
      (r: { role: string }) => r.role === "admin" || r.role === "staff",
    );

    if (!isAdminOrStaff) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, manifest.webmanifest, sw.js, workbox-*
     * - /brand/** and /illustrations/** (static assets)
     * - /api/auth/** and /api/public/** (auth + public API)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|manifest.webmanifest|sw.js|workbox-|brand/|illustrations/|api/auth|api/public).*)",
  ],
};
