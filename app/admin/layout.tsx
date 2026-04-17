import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAdminFn } from "@/lib/auth/checkAdmin";
import { AdminSidebar } from "./_components/AdminSidebar";

/**
 * Admin shell — server-side guard + sidebar/topbar shell.
 * Middleware already protects /admin/**, but we also check here as a
 * defense-in-depth measure and to load the user's profile for the header.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin");
  const ok = await isAdminFn(user.id);
  if (!ok) redirect("/login?redirect=/admin");

  // Load profile and unread count in parallel
  const [{ data: profile }, { count: unreadCount }] = await Promise.all([
    supabase
      .from("customer_profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_user_id", user.id)
      .is("read_at", null),
  ]);

  return (
    <div className="min-h-screen bg-papel">
      <AdminSidebar
        user={{
          id: user.id,
          email: user.email ?? null,
          fullName: profile?.full_name ?? null,
        }}
        unreadCount={unreadCount ?? 0}
      />
      <div className="md:pl-64">
        <main className="container max-w-none mx-auto px-4 py-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
