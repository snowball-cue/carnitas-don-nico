import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateCateringIcs } from "@/lib/ics";
import type { CateringRequestRow } from "@/types/database";

// Node.js runtime — Supabase service-role client is not edge-compatible.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PICKUP_ADDRESS = "379 Nottingham Loop, Kyle, TX 78640";

function buildReference(id: string): string {
  return `CAT-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

/**
 * GET /api/catering/:id/ics — download an .ics calendar file for a catering
 * request. Unauthenticated on purpose: the UUID is unguessable for an MVP
 * and the payload leaks nothing beyond what was emailed to the customer.
 *
 * A signed token could be layered on later if we ever expose more PII.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await ctx.params;

  // Basic UUID shape check — stops wasted DB lookups on garbage paths.
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const db = createServiceRoleClient();
    const { data, error } = await db
      .from("catering_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return new NextResponse("Not found", { status: 404 });
    }

    const row = data as CateringRequestRow;
    const reference = buildReference(row.id);
    const pickupAddress =
      process.env.NEXT_PUBLIC_PICKUP_ADDRESS || DEFAULT_PICKUP_ADDRESS;

    const ics = generateCateringIcs({
      uid: row.id,
      reference,
      eventDate: row.event_date,
      timeSlot: row.event_time_slot,
      guestCount: Number(row.guest_count),
      estimatedLbs: Number(row.estimated_lbs),
      deliveryNeeded: row.delivery_needed,
      eventLocation: row.event_location,
      pickupAddress,
      customerName: row.full_name,
      summaryLocale: "en",
    });

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="CarnitasDonNico-${reference}.ics"`,
        "Cache-Control": "private, max-age=0, no-store",
      },
    });
  } catch (e) {
    console.error("[catering/ics] failed:", e);
    return new NextResponse("Server error", { status: 500 });
  }
}
