"use server";

import * as React from "react";
import { z } from "zod";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import CateringRequestOwner from "@/lib/email/templates/CateringRequestOwner";
import CateringRequestCustomer from "@/lib/email/templates/CateringRequestCustomer";
import { getAppUrl, type Locale } from "@/lib/email/templates/_shared";
import type { CateringRequestRow } from "@/types/database";

const OWNER_EMAIL_FALLBACK = "carnitasdonnico25@gmail.com";

const inputSchema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  guestCount: z
    .number()
    .int()
    .min(10, "Minimum 10 guests"),
  estimatedLbs: z.number().min(10, "Minimum 10 lbs"),
  eventType: z.string().trim().max(120).optional().nullable(),
  eventLocation: z.string().trim().max(500).optional().nullable(),
  cutsPreference: z.string().trim().max(500).optional().nullable(),
  includesSides: z.boolean().default(true),
  deliveryNeeded: z.boolean().default(false),
  notes: z.string().trim().max(4000).optional().nullable(),
  locale: z.enum(["en", "es"]).default("es"),
});

export type CateringRequestInput = z.input<typeof inputSchema>;

export interface CateringActionResult {
  success: boolean;
  reference?: string;
  error?: string;
}

function buildReference(id: string): string {
  return `CAT-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export async function submitCateringRequest(
  input: CateringRequestInput,
): Promise<CateringActionResult> {
  try {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }
    const data = parsed.data;

    // If there's an authenticated user, attach their id.
    let customerId: string | null = null;
    try {
      const authClient = await createServerSupabaseClient();
      const { data: authData } = await authClient.auth.getUser();
      customerId = authData.user?.id ?? null;
    } catch {
      // anon — fine
    }

    // Public contact form — anyone can insert via the RLS policy, but we use
    // the service-role client to make it bulletproof against auth hiccups.
    const db = createServiceRoleClient();

    const { data: inserted, error } = await db
      .from("catering_requests")
      .insert({
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        event_date: data.eventDate,
        guest_count: data.guestCount,
        estimated_lbs: data.estimatedLbs,
        event_type: data.eventType ?? null,
        event_location: data.eventLocation ?? null,
        cuts_preference: data.cutsPreference ?? null,
        includes_sides: data.includesSides,
        delivery_needed: data.deliveryNeeded,
        notes: data.notes ?? null,
        status: "new",
        customer_id: customerId,
      })
      .select("*")
      .single();

    if (error) throw error;
    const row = inserted as CateringRequestRow;
    const reference = buildReference(row.id);

    // Fire emails — non-blocking on failure (sendEmail already no-ops safely
    // when Resend isn't configured).
    const owner = process.env.OWNER_EMAIL || OWNER_EMAIL_FALLBACK;
    const appUrl = getAppUrl();
    const adminUrl = `${appUrl}/admin/catering/${row.id}`;
    const locale: Locale = data.locale === "en" ? "en" : "es";

    try {
      await sendEmail({
        to: owner,
        subject: `New catering request — ${data.guestCount} guests · ${data.eventDate}`,
        react: React.createElement(CateringRequestOwner, {
          reference,
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          eventDate: data.eventDate,
          guestCount: data.guestCount,
          estimatedLbs: data.estimatedLbs,
          eventType: data.eventType ?? null,
          eventLocation: data.eventLocation ?? null,
          cutsPreference: data.cutsPreference ?? null,
          includesSides: data.includesSides,
          deliveryNeeded: data.deliveryNeeded,
          notes: data.notes ?? null,
          adminUrl,
        }),
      });
    } catch (e) {
      console.error("[catering] owner email failed:", e);
    }

    try {
      await sendEmail({
        to: data.email,
        subject:
          "¡Recibimos tu solicitud de catering! / We got your catering request!",
        react: React.createElement(CateringRequestCustomer, {
          locale,
          reference,
          customerName: data.fullName,
          eventDate: data.eventDate,
          guestCount: data.guestCount,
          estimatedLbs: data.estimatedLbs,
          eventType: data.eventType ?? null,
          includesSides: data.includesSides,
          deliveryNeeded: data.deliveryNeeded,
        }),
        bcc: owner,
      });
    } catch (e) {
      console.error("[catering] customer email failed:", e);
    }

    return { success: true, reference };
  } catch (e) {
    console.error("[catering] submitCateringRequest failed:", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to submit request",
    };
  }
}

export interface UpdateCateringInput {
  id: string;
  status?: CateringRequestRow["status"];
  quotedPrice?: number | null;
  notes?: string | null;
}

export async function updateCateringRequest(
  input: UpdateCateringInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await createServerSupabaseClient();
    const patch: Record<string, unknown> = {
      updated_by_admin_at: new Date().toISOString(),
    };
    if (input.status) patch.status = input.status;
    if (input.quotedPrice !== undefined) patch.quoted_price = input.quotedPrice;
    if (input.notes !== undefined) patch.notes = input.notes;

    const { error } = await db
      .from("catering_requests")
      .update(patch)
      .eq("id", input.id);
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed",
    };
  }
}
