import Link from "next/link";
import { format } from "date-fns";
import {
  CalendarDays,
  Bell,
  ArrowRight,
  Flame,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DashboardGreeting } from "./_components/DashboardGreeting";
import { QuickActions } from "./_components/QuickActions";
import { CapacityBar } from "./_components/CapacityBar";
import { CountdownPill } from "./_components/CountdownPill";
import { T } from "./_components/TranslatedText";
import { StatusPill } from "./_components/StatusPill";

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
    customer_name: string | null;
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

  const rawRecent = (recentOrdersRes.data ?? []) as Array<{
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

  const recentCustomerIds = Array.from(
    new Set(
      rawRecent
        .filter((o) => !o.guest_name && o.customer_id)
        .map((o) => o.customer_id as string),
    ),
  );
  const nameMap = new Map<string, string>();
  if (recentCustomerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("customer_profiles")
      .select("id, full_name")
      .in("id", recentCustomerIds);
    (profiles ?? []).forEach((p) => {
      if (p.full_name) nameMap.set(p.id, p.full_name);
    });
  }

  const recentOrders = rawRecent.map((o) => ({
    ...o,
    customer_name: o.customer_id ? (nameMap.get(o.customer_id) ?? null) : null,
  }));

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
    recentOrders,
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
  const today = format(new Date(), "yyyy-MM-dd");
  const isPickupToday =
    d.nextPickup?.pickup_date === today;

  return (
    <div className="space-y-8">
      {/* Hero greeting */}
      <div className="flex flex-col gap-2">
        <DashboardGreeting name={d.profileName} />
        <T
          as="p"
          className="text-lg text-mole/70"
          k="admin.dashboard.subtitle"
        />
      </div>

      {/* Today strip — the most important card */}
      <Card className="border-2 border-oro/40 bg-gradient-to-r from-oro/10 via-papel to-papel">
        <CardContent className="p-5 md:p-6">
          {d.nextPickup ? (
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${
                    isPickupToday ? "bg-chile text-papel" : "bg-oro text-mole"
                  }`}
                >
                  {isPickupToday ? (
                    <Flame className="h-7 w-7" strokeWidth={2.25} />
                  ) : (
                    <CalendarDays className="h-7 w-7" strokeWidth={2.25} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <p className="font-display text-3xl text-mole leading-tight">
                      {isPickupToday ? (
                        <T k="admin.dashboard.todayIsPickup" />
                      ) : (
                        format(
                          new Date(`${d.nextPickup.pickup_date}T12:00:00`),
                          "EEEE, MMMM d",
                        )
                      )}
                    </p>
                    <CountdownPill iso={d.nextPickup.cutoff_at} />
                  </div>
                  <p className="mt-1 text-base text-mole/75">
                    <T
                      k="admin.dashboard.ordersOnDate"
                      values={{ count: d.nextPickup.order_count }}
                    />
                    <span className="mx-2 text-mole/40">·</span>
                    {d.nextPickup.pickup_window_start.slice(0, 5)}–
                    {d.nextPickup.pickup_window_end.slice(0, 5)}
                  </p>
                </div>
              </div>
              <div className="md:w-72 shrink-0">
                <CapacityBar
                  reserved={Number(d.nextPickup.reserved_lbs)}
                  capacity={Number(d.nextPickup.capacity_lbs)}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-papel-warm text-mole/60">
                  <CalendarDays className="h-7 w-7" strokeWidth={2.25} />
                </div>
                <p className="font-display text-2xl text-mole">
                  <T k="admin.dashboard.noUpcomingPickupShort" />
                </p>
              </div>
              <Link
                href="/admin/calendar"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-nopal px-6 text-base font-semibold text-papel hover:bg-nopal/90"
              >
                <T k="admin.dashboard.actionNewPickup" />
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Big action tiles */}
      <QuickActions />

      {/* Recent orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="font-display text-2xl text-mole">
            <T k="admin.dashboard.recentOrders" />
          </CardTitle>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1 text-base font-semibold text-nopal hover:underline underline-offset-4"
          >
            <T k="admin.dashboard.viewAll" />
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          {d.recentOrders.length === 0 ? (
            <T
              as="p"
              k="admin.dashboard.noRecentOrders"
              className="py-6 text-center text-base text-mole/60"
            />
          ) : (
            <ul className="divide-y divide-mole/10">
              {d.recentOrders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="flex items-center justify-between gap-4 px-1 py-4 hover:bg-papel/40 rounded-md"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold text-mole truncate">
                        {o.guest_name ??
                          o.customer_name ??
                          <T k="admin.dashboard.registeredCustomer" />}
                      </p>
                      <p className="text-sm text-mole/60">
                        {o.order_number} ·{" "}
                        {format(new Date(o.created_at), "MMM d, h:mm a")} ·{" "}
                        {Number(o.total_lbs).toFixed(1)} lb
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusPill status={o.status} />
                      <span className="font-display text-xl text-mole tabular-nums">
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

      {/* This week at a glance — quiet bottom strip */}
      <div>
        <h2 className="mb-3 font-display text-xl text-mole/80">
          <T k="admin.dashboard.weekGlanceTitle" />
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-mole/60">
                <T k="admin.dashboard.revenue" />
              </p>
              <p className="mt-1 font-display text-3xl text-mole tabular-nums">
                {fmtMoney(d.mtdRevenue)}
              </p>
              <p className="mt-1 text-sm text-mole/60">
                {fmtMoney(d.todayRevenue)} <T k="admin.dashboard.today" />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-mole/60">
                <T k="admin.dashboard.orders" />
              </p>
              <p className="mt-1 font-display text-3xl text-mole tabular-nums">
                {d.todayOrderCount}
              </p>
              <p className="mt-1 text-sm text-mole/60">
                <T
                  k="admin.dashboard.pendingPickups"
                  values={{ count: d.pendingPickupCount }}
                />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-sm text-mole/60">
                <Bell className="h-4 w-4" />
                <T k="admin.dashboard.notifications" />
              </div>
              <p className="mt-1 font-display text-3xl text-mole tabular-nums">
                {d.unreadCount}
              </p>
              <Link
                href="/admin/notifications"
                className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-nopal hover:underline underline-offset-4"
              >
                <T k="admin.dashboard.viewNotifications" />
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
