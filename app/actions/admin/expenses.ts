"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/checkAdmin";
import type { ExpenseCategory, ExpenseInsert } from "@/types/database";
import type { ActionResult } from "./orders";

export interface CreateExpenseInput {
  expense_date: string; // YYYY-MM-DD
  event_date?: string | null;
  category: ExpenseCategory;
  description?: string | null;
  amount: number;
  quantity?: number | null;
  unit_cost?: number | null;
  receipt_id?: string | null;
  receipt_image_url?: string | null;
}

export async function createExpense(
  input: CreateExpenseInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId } = await requireAdmin();
    if (!Number.isFinite(input.amount)) {
      return { success: false, error: "Invalid amount" };
    }
    const svc = createServiceRoleClient();
    const row: ExpenseInsert = {
      expense_date: input.expense_date,
      event_date: input.event_date ?? null,
      category: input.category,
      description: input.description ?? null,
      amount: input.amount,
      quantity: input.quantity ?? null,
      unit_cost: input.unit_cost ?? null,
      receipt_id: input.receipt_id ?? null,
      receipt_image_url: input.receipt_image_url ?? null,
      created_by: userId,
    };
    const { data, error } = await svc
      .from("expenses")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    revalidatePath("/admin/expenses");
    revalidatePath("/admin");
    return { success: true, data: { id: data.id } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create expense",
    };
  }
}

export async function updateExpense(
  id: string,
  patch: Partial<CreateExpenseInput>,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const svc = createServiceRoleClient();
    const { error } = await svc.from("expenses").update(patch).eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/expenses");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update expense",
    };
  }
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const svc = createServiceRoleClient();
    const { error } = await svc.from("expenses").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/expenses");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete expense",
    };
  }
}

export interface CreateManualRevenueInput {
  event_date: string;
  amount: number;
  lbs_sold?: number | null;
  description?: string | null;
}

export async function createManualRevenue(
  input: CreateManualRevenueInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId } = await requireAdmin();
    if (!Number.isFinite(input.amount) || input.amount < 0) {
      return { success: false, error: "Invalid amount" };
    }
    const svc = createServiceRoleClient();
    const { data, error } = await svc
      .from("manual_revenue")
      .insert({
        event_date: input.event_date,
        amount: input.amount,
        lbs_sold: input.lbs_sold ?? null,
        description: input.description ?? null,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    revalidatePath("/admin/expenses");
    revalidatePath("/admin");
    return { success: true, data: { id: data.id } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create manual revenue",
    };
  }
}
