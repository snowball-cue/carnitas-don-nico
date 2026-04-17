"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/checkAdmin";
import type { InvestmentInsert } from "@/types/database";
import type { ActionResult } from "./orders";

export interface UpsertInvestmentInput {
  id?: string;
  item_name: string;
  cost: number;
  purchase_date: string; // YYYY-MM-DD
  category?: string | null;
  notes?: string | null;
  receipt_id?: string | null;
}

export async function upsertInvestment(
  input: UpsertInvestmentInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId } = await requireAdmin();
    if (!Number.isFinite(input.cost) || input.cost < 0) {
      return { success: false, error: "Invalid cost" };
    }
    const svc = createServiceRoleClient();
    const row: InvestmentInsert = {
      item_name: input.item_name,
      cost: input.cost,
      purchase_date: input.purchase_date,
      category: input.category ?? null,
      notes: input.notes ?? null,
      receipt_id: input.receipt_id ?? null,
      created_by: userId,
    };

    if (input.id) {
      const { error } = await svc
        .from("investments")
        .update(row)
        .eq("id", input.id);
      if (error) throw error;
      revalidatePath("/admin/investments");
      return { success: true, data: { id: input.id } };
    }

    const { data, error } = await svc
      .from("investments")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    revalidatePath("/admin/investments");
    return { success: true, data: { id: data.id } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to save investment",
    };
  }
}

export async function deleteInvestment(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const svc = createServiceRoleClient();
    const { error } = await svc.from("investments").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/investments");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete",
    };
  }
}
