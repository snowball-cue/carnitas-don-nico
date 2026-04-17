"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/checkAdmin";
import type { ActionResult } from "./orders";

export interface UpsertPickupDateInput {
  id?: string;
  pickup_date: string; // YYYY-MM-DD
  capacity_lbs: number;
  pickup_window_start?: string; // HH:MM
  pickup_window_end?: string;
  cutoff_at: string; // ISO timestamptz
  is_open?: boolean;
  notes_en?: string | null;
  notes_es?: string | null;
}

export async function upsertPickupDate(
  input: UpsertPickupDateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    if (!input.pickup_date || !input.cutoff_at) {
      return { success: false, error: "pickup_date and cutoff_at are required" };
    }
    if (!Number.isFinite(input.capacity_lbs) || input.capacity_lbs < 0) {
      return { success: false, error: "capacity_lbs must be non-negative" };
    }
    const svc = createServiceRoleClient();

    const row = {
      pickup_date: input.pickup_date,
      capacity_lbs: input.capacity_lbs,
      cutoff_at: input.cutoff_at,
      pickup_window_start: input.pickup_window_start ?? "11:00",
      pickup_window_end: input.pickup_window_end ?? "14:00",
      is_open: input.is_open ?? true,
      notes_en: input.notes_en ?? null,
      notes_es: input.notes_es ?? null,
    };

    let id = input.id;
    if (id) {
      const { error } = await svc.from("pickup_dates").update(row).eq("id", id);
      if (error) throw error;
    } else {
      const { data, error } = await svc
        .from("pickup_dates")
        .upsert(row, { onConflict: "pickup_date" })
        .select("id")
        .single();
      if (error) throw error;
      id = data.id;
    }
    revalidatePath("/admin/calendar");
    revalidatePath("/admin");
    revalidatePath("/pickup");
    return { success: true, data: { id: id! } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to save pickup date",
    };
  }
}

export async function deletePickupDate(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const svc = createServiceRoleClient();
    const { count, error: cntErr } = await svc
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("pickup_date_id", id);
    if (cntErr) throw cntErr;
    if ((count ?? 0) > 0) {
      return {
        success: false,
        error: "Cannot delete — orders exist on this date. Close it instead.",
      };
    }
    const { error } = await svc.from("pickup_dates").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/calendar");
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete pickup date",
    };
  }
}
