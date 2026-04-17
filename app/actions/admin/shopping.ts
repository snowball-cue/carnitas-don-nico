"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/checkAdmin";
import type { ShoppingListInsert } from "@/types/database";
import type { ActionResult } from "./orders";

export interface UpsertShoppingItemInput {
  id?: string;
  item_name_en: string;
  item_name_es?: string | null;
  quantity?: number | null;
  unit?: string | null;
  estimated_cost?: number | null;
  notes?: string | null;
  needed_by_date?: string | null;
  is_purchased?: boolean;
}

export async function upsertShoppingItem(
  input: UpsertShoppingItemInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId } = await requireAdmin();
    const svc = createServiceRoleClient();
    const row: ShoppingListInsert = {
      item_name_en: input.item_name_en,
      item_name_es: input.item_name_es ?? null,
      quantity: input.quantity ?? null,
      unit: input.unit ?? null,
      estimated_cost: input.estimated_cost ?? null,
      notes: input.notes ?? null,
      needed_by_date: input.needed_by_date ?? null,
      is_purchased: input.is_purchased ?? false,
      created_by: userId,
    };

    if (input.id) {
      const { error } = await svc
        .from("shopping_list")
        .update(row)
        .eq("id", input.id);
      if (error) throw error;
      revalidatePath("/admin/shopping-list");
      return { success: true, data: { id: input.id } };
    }

    const { data, error } = await svc
      .from("shopping_list")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    revalidatePath("/admin/shopping-list");
    return { success: true, data: { id: data.id } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to save item",
    };
  }
}

export async function markPurchased(
  id: string,
  purchased: boolean,
): Promise<ActionResult> {
  try {
    const { userId } = await requireAdmin();
    const svc = createServiceRoleClient();
    const { error } = await svc
      .from("shopping_list")
      .update({
        is_purchased: purchased,
        purchased_at: purchased ? new Date().toISOString() : null,
        purchased_by: purchased ? userId : null,
      })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/shopping-list");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to mark purchased",
    };
  }
}

export async function deleteShoppingItem(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const svc = createServiceRoleClient();
    const { error } = await svc.from("shopping_list").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/shopping-list");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete item",
    };
  }
}
