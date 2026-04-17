"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PickupDateRow } from "@/types/database";

export async function getOpenPickupDates(): Promise<{
  success: boolean;
  data?: PickupDateRow[];
  error?: string;
}> {
  try {
    const supabase = await createServerSupabaseClient();
    const today = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from("pickup_dates")
      .select("*")
      .eq("is_open", true)
      .gte("pickup_date", today)
      .gt("cutoff_at", nowIso)
      .order("pickup_date", { ascending: true });

    if (error) throw error;
    return { success: true, data: (data as PickupDateRow[]) ?? [] };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to load pickup dates",
    };
  }
}

export async function getPickupDate(id: string): Promise<{
  success: boolean;
  data?: PickupDateRow;
  error?: string;
}> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("pickup_dates")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { success: false, error: "Not found" };
    return { success: true, data: data as PickupDateRow };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed",
    };
  }
}

export async function getCapacityRemaining(pickupDateId: string): Promise<{
  success: boolean;
  data?: number;
  error?: string;
}> {
  try {
    const r = await getPickupDate(pickupDateId);
    if (!r.success || !r.data) {
      return { success: false, error: r.error ?? "Not found" };
    }
    return {
      success: true,
      data: Math.max(0, r.data.capacity_lbs - r.data.reserved_lbs),
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed",
    };
  }
}
