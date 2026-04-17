"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/checkAdmin";
import type { ExpenseCategory, ReceiptStatus } from "@/types/database";
import type { ActionResult } from "./orders";

/**
 * Uploads a receipt photo to the private `receipts` bucket and creates
 * a pending_review row in `receipts`. Returns the new receipt id.
 */
export async function uploadReceipt(
  form: FormData,
): Promise<ActionResult<{ id: string; storage_path: string }>> {
  try {
    const { userId } = await requireAdmin();
    const file = form.get("file") as File | null;
    if (!file || !(file instanceof File)) {
      return { success: false, error: "No file provided" };
    }
    const svc = createServiceRoleClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${Date.now()}.${ext}`;
    const buf = await file.arrayBuffer();
    const { error: upErr } = await svc.storage
      .from("receipts")
      .upload(path, new Uint8Array(buf), {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });
    if (upErr) throw upErr;

    const { data: row, error } = await svc
      .from("receipts")
      .insert({
        storage_path: path,
        uploaded_by: userId,
        status: "pending_review" as ReceiptStatus,
      })
      .select("id, storage_path")
      .single();
    if (error) throw error;

    revalidatePath("/admin/receipts");
    return { success: true, data: { id: row.id, storage_path: row.storage_path } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to upload receipt",
    };
  }
}

/**
 * Stub: real parser will use ANTHROPIC_API_KEY + Claude vision to extract
 * store_name, purchase_date, parsed_total, and line items into parsed_json.
 * For now, leaves the receipt as pending_review with an explanatory note.
 */
export async function parseReceipt(id: string): Promise<
  ActionResult<{ parsed_total: number | null; status: ReceiptStatus; note: string }>
> {
  try {
    await requireAdmin();
    const svc = createServiceRoleClient();
    const note =
      "AI parsing will be wired with ANTHROPIC_API_KEY (Claude vision). Please fill fields manually.";
    const { error } = await svc
      .from("receipts")
      .update({ notes: note, status: "pending_review" })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/receipts");
    return {
      success: true,
      data: { parsed_total: null, status: "pending_review", note },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to parse receipt",
    };
  }
}

export async function approveReceipt(
  id: string,
  patch: {
    store_name?: string | null;
    purchase_date?: string | null;
    parsed_total?: number | null;
    notes?: string | null;
  } = {},
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const svc = createServiceRoleClient();
    const { error } = await svc
      .from("receipts")
      .update({ ...patch, status: "approved" })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/receipts");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to approve receipt",
    };
  }
}

export async function rejectReceipt(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const svc = createServiceRoleClient();
    const { error } = await svc
      .from("receipts")
      .update({ status: "rejected" })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/receipts");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to reject receipt",
    };
  }
}

/**
 * Creates an expense row from a receipt, linking them both ways.
 */
export async function convertReceiptToExpense(
  id: string,
  category: ExpenseCategory,
): Promise<ActionResult<{ expense_id: string }>> {
  try {
    const { userId } = await requireAdmin();
    const svc = createServiceRoleClient();

    const { data: receipt, error: rErr } = await svc
      .from("receipts")
      .select("id, parsed_total, purchase_date, store_name, linked_expense_ids")
      .eq("id", id)
      .maybeSingle();
    if (rErr) throw rErr;
    if (!receipt) return { success: false, error: "Receipt not found" };
    if (receipt.parsed_total == null) {
      return {
        success: false,
        error: "Receipt total is missing — fill it in first",
      };
    }
    const purchaseDate =
      receipt.purchase_date ?? new Date().toISOString().slice(0, 10);

    const { data: expense, error: eErr } = await svc
      .from("expenses")
      .insert({
        expense_date: purchaseDate,
        category,
        description: receipt.store_name ?? "Receipt",
        amount: receipt.parsed_total,
        receipt_id: id,
        created_by: userId,
      })
      .select("id")
      .single();
    if (eErr) throw eErr;

    const linked = [...(receipt.linked_expense_ids ?? []), expense.id];
    const { error: uErr } = await svc
      .from("receipts")
      .update({ linked_expense_ids: linked, status: "approved" })
      .eq("id", id);
    if (uErr) throw uErr;

    revalidatePath("/admin/receipts");
    revalidatePath("/admin/expenses");
    return { success: true, data: { expense_id: expense.id } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to convert receipt",
    };
  }
}
