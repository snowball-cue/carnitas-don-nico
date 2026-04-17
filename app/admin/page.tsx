import Link from "next/link";
import { format } from "date-fns";
import {
  ShoppingBag,
  DollarSign,
  CalendarDays,
  Bell,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DashboardGreeting } from "./_components/DashboardGreeting";
import { QuickActions } from "./_components/QuickActions";
import { CapacityBar } from "./_components/CapacityBar";
import { CountdownPill } from "./_components/CountdownPill";
import { T } from "./_components/TranslatedText";

export const dynamic = "force-dynamic";

interface TodayData {
  profileName: string | null;
  nextPickup: {
    id: string;
    pickup_date: string;
    pickup_window_start: string;
    pickup_window_end: string;
    capacity_lbs: number;
    reserved_lbs: number;
    cutoff_at: string;
    order_count: number;
  } | null;
  todayOrderCount: number;
  todayRevenue: number;
  mtdRevenue: number;
  unreadCount: number;
  recentOrders: Array<{
    id: string;
    order_number: string;
    guest_name: string | null;
    customer_id: string | null;
    total: number;
    total_lbs: number;
    status: string;
    created_at: string;
    pickup_date: string;
  }>;
  pendingPickupCount: number;
}

async function loadData(): Promise<TodayData> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user?.id ?? "";

  const today = format(new Date(), "yyyy-MM-dd");
  const startOfTodayIso = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  ).toISOString();
  const firstOfMonthIso = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).toISOString();

  const [
    profileRes,
    nextPickupRes,
    todayOrdersRes,
    todayRevenueRes,
    mtdRevenueRes,
    unreadRes,
    recentOrdersRes,
    pendingPickupRes,
  ] = await Promise.all([
    supabase
      .from("customer_profiles")
      .select("full_name")
      .eq("id", uid)
      .maybeSingle(),
    supabase
      .from("pickup_dates")
      .select(
        "id, pickup_date, pickup_window_start, pickup_window_end, capacity_lbs, reserved_lbs, cutoff_at",
      )
      .gte("pickup_date", today)
      .order("pickup_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfTodayIso),
    supabase
      .from("orders")
      .select("total")
      .gte("created_at", startOfTodayIso)
      .in("payment_status", ["paid", "deposit_paid"]),
    supabase
      .from("orders")
      .select("total")
      .gte("created_at", firstOfMonthIso)
      .in("payment_status", ["paid", "deposit_paid"]),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_user_id", uid)
      .is("read_at", null),
    supabase
      .from("orders")
      .select(
        "id, order_number, guest_name, customer_id, total, total_lbs, status, created_at, pickup_date",
      )
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["confirmed", "ready"])
      .gte("pickup_date", today),
  ]);

  let pickupOrderCount = 0;
  if (nextPickupRes.data?.id) {
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("pickup_date_id", nextPickupRes.data.id)
      .not("status", "in", "(cancelled,no_show)");
    pickupOrderCount = count ?? 0;
  }

  const sumTotals = (
    rows: Array<{ total: number | string | null }> | null | undefined,
  ) => (rows ?? []).reduce((acc, r) => acc + Number(r.total ?? 0), 0);

  return {
    profileName:
      (profileRes.data as { full_name: string | null } | null)?.full_name ?? null,
    nextPickup: nextPickupRes.data
      ? { ...nextPickupRes.data, order_count: pickupOrderCount }
      : null,
    todayOrderCount: todayOrdersRes.count ?? 0,
    todayRevenue: sumTotals(
      todayRevenueRes.data as Array<{ total: number | string | null }> | null,
    ),
    mtdRevenue: sumTotals(
      mtdRevenueRes.data as Array<{ total: number | string | null }> | null,
    ),
    unreadCount: unreadRes.count ?? 0,
    recentOrders: (recentOrdersRes.data ?? []) as TodayData["recentOrders"],
    pendingPickupCount: pendingPickupRes.count ?? 0,
  };
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function AdminDashboardPage() {
  const d = await loadData();

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex flex-col gap-2">
        <DashboardGreeting name={d.profileName} />
        <T
          as="p"
          className="text-mole/70"
          k="admin.dashboard.subtitle"
        />
      </div>

      {/* Quick actions */}
      <QuickActions />

      {/* Top cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Next pickup */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-nopal" />
                <CardTitle className="text-base">
                  <T k="admin.dashboard.nextPickup" />
                </CardTitle>
              </div>
              {d.nextPickup ? <CountdownPill iso={d.nextPickup.cutoff_at} /> : null}
            </div>
          </CardHeader>
          <CardContent>
            {d.nextPickup ? (
              <div className="space-y-3">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-2xl text-mole">
                    {format(
                      new Date(`${d.nextPickup.pickup_date}T12:00:00`),
                      "EEE MMM d",
                    )}
                  </span>
                  <span className="text-sm text-mole/70">
                    {d.nextPickup.pickup_window_start.slice(0, 5)}–
                    {d.nextPickup.pickup_window_end.slice(0, 5)}
                  </span>
                </div>
                <CapacityBar
                  reserved={Number(d.nextPickup.reserved_lbs)}
                  capacity={Number(d.nextPickup.capacity_lbs)}
                />
                <div className="text-sm text-mole/80">
                  <T
                    k="admin.dashboard.ordersOnDate"
                    values={{ count: d.nextPickup.order_count }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <T
                  as="p"
                  k="admin.dashboard.noUpcomingPickup"
                  className="text-mole/70"
                />
                <Link
                  href="/admin/calendar"
                  className="inline-flex items-center gap-1 text-sm text-nopal underline-offset-4 hover:underline"
                >
                  <T k="admin.quickActions.newPickup" />
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-nopal" />
              <CardTitle className="text-base">
                <T k="admin.dashboard.revenue" />
              </CardTitle>
            </div>
            <CardDescription>
              <T k="admin.dashboard.todayAndMtd" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl text-mole">
                {fmtMoney(d.todayRevenue)}
              </span>
              <span className="text-xs text-mole/60">
                <T k="admin.dashboard.today" />
              </span>
            </div>
            <div className="mt-2 text-sm text-mole/70">
              <T
                k="admin.dashboard.mtdValue"
                values={{ amount: fmtMoney(d.mtdRevenue) }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Orders */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-nopal" />
              <CardTitle className="text-base">
                <T k="admin.dashboard.orders" />
              </CardTitle>
            </div>
            <CardDescription>
              <T k="admin.dashboard.ordersDescription" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl text-mole">
                {d.todayOrderCount}
              </span>
              <span className="text-xs text-mole/60">
                <T k="admin.dashboard.newToday" />
              </span>
            </div>
            <div className="mt-2 text-sm text-mole/70">
              <T
                k="admin.dashboard.pendingPickups"
                values={{ count: d.pendingPickupCount }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent + Notifications row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-base">
              <T k="admin.dashboard.recentOrders" />
            </CardTitle>
            <Link
              href="/admin/orders"
              className="text-sm text-nopal underline-offset-4 hover:underline"
            >
              <T k="admin.dashboard.viewAll" />
            </Link>
          </CardHeader>
          <CardContent>
            {d.recentOrders.length === 0 ? (
              <T
                as="p"
                k="admin.dashboard.noRecentOrders"
                className="text-sm text-mole/60"
              />
            ) : (
              <ul className="divide-y divide-nopal/10">
                {d.recentOrders.map((o) => (
                  <li key={o.id} className="py-2">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="flex items-center justify-between gap-3 hover:bg-papel/40 rounded-md p-1 -m-1"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-mole truncate">
                          {o.order_number} ·{" "}
                          {o.guest_name ?? (
                            <T k="admin.dashboard.registeredCustomer" />
                          )}
                        </p>
                        <p className="text-xs text-mole/60">
                          {format(new Date(o.created_at), "MMM d HH:mm")} ·{" "}
                          {Number(o.total_lbs).toFixed(1)} lb
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={o.status === "pending" ? "outline" : "default"}
                          className="text-[10px]"
                        >
                          {o.status}
                        </Badge>
                        <span className="font-mono text-sm text-mole">
                          {fmtMoney(Number(o.total))}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-nopal" />
              <CardTitle className="text-base">
                <T k="admin.dashboard.notifications" />
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl text-mole">
                {d.unreadCount}
              </span>
              <span className="text-xs text-mole/60">
                <T k="admin.dashboard.unread" />
              </span>
            </div>
            <Link
              href="/admin/notifications"
              className="inline-flex items-center gap-1 text-sm text-nopal underline-offset-4 hover:underline"
            >
              <T k="admin.dashboard.viewNotifications" />
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
