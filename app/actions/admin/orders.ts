"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/checkAdmin";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/types/database";
import { sendPickupConfirmation } from "@/lib/email/orders";

export type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

const ALLOWED_STATUS: OrderStatus[] = [
  "pending",
  "confirmed",
  "ready",
  "picked_up",
  "cancelled",
  "no_show",
];

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (!ALLOWED_STATUS.includes(status)) {
      return { success: false, error: "Invalid status" };
    }
    const svc = createServiceRoleClient();

    const patch: Record<string, unknown> = { status };
    const now = new Date().toISOString();
    if (status === "confirmed") patch.confirmed_at = now;
    if (status === "picked_up") patch.picked_up_at = now;
    if (status === "cancelled") patch.cancelled_at = now;

    const { error } = await svc.from("orders").update(patch).eq("id", orderId);
    if (error) throw error;

    // When an order is marked picked_up, fire the thank-you / referral email.
    if (status === "picked_up") {
      try {
        const { data: orderRow } = await svc
          .from("orders")
          .select("order_number")
          .eq("id", orderId)
          .maybeSingle();
        const orderNumber = (orderRow as { order_number?: string } | null)
          ?.order_number;
        if (orderNumber) {
          await sendPickupConfirmation(orderNumber);
        }
      } catch (emailErr) {
        console.error(
          "[admin/orders.updateOrderStatus] sendPickupConfirmation failed:",
          emailErr,
        );
      }
    }

    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/calendar");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update status",
    };
  }
}

export async function recordPayment(
  orderId: string,
  amount: number,
  method: PaymentMethod,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (!Number.isFinite(amount) || amount < 0) {
      return { success: false, error: "Invalid amount" };
    }
    const svc = createServiceRoleClient();

    const { data: order, error: readErr } = await svc
      .from("orders")
      .select("total, deposit_paid")
      .eq("id", orderId)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!order) return { success: false, error: "Order not found" };

    const paid = Number(order.deposit_paid ?? 0) + amount;
    const total = Number(order.total ?? 0);
    const balance = Math.max(0, total - paid);

    let payment_status: PaymentStatus = "unpaid";
    if (paid <= 0) payment_status = "unpaid";
    else if (paid + 0.005 < total) payment_status = "deposit_paid";
    else payment_status = "paid";

    const { error } = await svc
      .from("orders")
      .update({
        deposit_paid: paid,
        balance_remaining: balance,
        payment_method: method,
        payment_status,
      })
      .eq("id", orderId);
    if (error) throw error;

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to record payment",
    };
  }
}

export async function addOrderNote(
  orderId: string,
  note: string,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const svc = createServiceRoleClient();
    const { error } = await svc
      .from("orders")
      .update({ notes: note })
      .eq("id", orderId);
    if (error) throw error;
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to save note",
    };
  }
}

export async function deleteOrder(orderId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const svc = createServiceRoleClient();
    const { error } = await svc.from("orders").delete().eq("id", orderId);
    if (error) throw error;
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/calendar");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete order",
    };
  }
}

export async function bulkUpdateStatus(
  orderIds: string[],
  status: OrderStatus,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (!ALLOWED_STATUS.includes(status)) {
      return { success: false, error: "Invalid status" };
    }
    const svc = createServiceRoleClient();
    const patch: Record<string, unknown> = { status };
    const now = new Date().toISOString();
    if (status === "confirmed") patch.confirmed_at = now;
    if (status === "ready") patch.confirmed_at = now;
    if (status === "picked_up") patch.picked_up_at = now;
    const { error } = await svc.from("orders").update(patch).in("id", orderIds);
    if (error) throw error;
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return { success: true, data: { updated: orderIds.length } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to bulk update",
    };
  }
}
