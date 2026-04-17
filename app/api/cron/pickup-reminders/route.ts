import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendPickupReminder } from "@/lib/email/orders";
import type { OrderRow, OrderStatus } from "@/types/database";

// Route handler — NOT a server action. Runs on the Node.js runtime so we can
// use the service-role Supabase client and the Resend SDK.
export const runtime = "nodejs";
// Never cache: this is a cron-triggered side-effecting endpoint.
export const dynamic = "force-dynamic";

const REMINDABLE_STATUSES: OrderStatus[] = ["pending", "confirmed", "ready"];

/**
 * Compute "tomorrow" as a YYYY-MM-DD string in America/Chicago. Vercel crons
 * run in UTC; we need the kitchen's local calendar day.
 */
function tomorrowInChicago(): string {
  const now = new Date();
  // Use Intl to get y/m/d in America/Chicago, then add one day.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const y = Number(get("year"));
  const m = Number(get("month"));
  const d = Number(get("day"));
  // Construct as UTC-midnight then bump one day — safe for date math.
  const todayUtc = new Date(Date.UTC(y, m - 1, d));
  const tomorrowUtc = new Date(todayUtc.getTime() + 24 * 60 * 60 * 1000);
  const yy = tomorrowUtc.getUTCFullYear();
  const mm = String(tomorrowUtc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(tomorrowUtc.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tomorrow = tomorrowInChicago();
  const db = createServiceRoleClient();

  const { data, error } = await db
    .from("orders")
    .select("order_number, status")
    .eq("pickup_date", tomorrow)
    .in("status", REMINDABLE_STATUSES);

  if (error) {
    console.error("[cron/pickup-reminders] query failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orders = (data as Pick<OrderRow, "order_number" | "status">[]) ?? [];
  let sent = 0;
  let skipped = 0;
  const failures: Array<{ orderNumber: string; reason: string }> = [];

  for (const o of orders) {
    const result = await sendPickupReminder(o.order_number);
    if (result.sent) {
      sent += 1;
    } else if (result.skipped) {
      skipped += 1;
    } else {
      failures.push({
        orderNumber: o.order_number,
        reason: result.error ?? "unknown",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    pickupDate: tomorrow,
    eligible: orders.length,
    sent,
    skipped,
    failed: failures.length,
    failures,
  });
}
