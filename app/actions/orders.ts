"use server";

import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";
import type {
  OrderRow,
  OrderItemRow,
  PickupDateRow,
  PaymentMethod,
  PaymentStatus,
} from "@/types/database";
import type { CartLine } from "@/lib/stores/cart";
import { sendOrderReceipt } from "@/lib/email/orders";

export interface CreateOrderInput {
  cart: CartLine[];
  pickupDateId: string;
  tip: number;
  paymentMethod: "pay_in_full" | "deposit_50" | "pay_in_person";
  customerInfo: {
    name: string;
    phone: string;
    email?: string;
  };
  isGuest: boolean;
  notes?: string;
}

export interface OrderActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  orderNumber?: string;
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

export async function createOrder(
  input: CreateOrderInput
): Promise<OrderActionResult<{ orderNumber: string; orderId: string }>> {
  try {
    if (!input.cart || input.cart.length === 0) {
      return { success: false, error: "Cart is empty" };
    }
    if (!input.pickupDateId) {
      return { success: false, error: "Missing pickup date" };
    }
    if (!input.customerInfo.phone) {
      return { success: false, error: "Phone required" };
    }

    // Pick client based on guest vs authenticated
    const authClient = await createServerSupabaseClient();
    const { data: authData } = await authClient.auth.getUser();
    const authUser = authData.user;

    const db = input.isGuest || !authUser
      ? createServiceRoleClient()
      : authClient;

    // Fetch pickup date + validate capacity
    const { data: pickupRow, error: pickupErr } = await db
      .from("pickup_dates")
      .select("*")
      .eq("id", input.pickupDateId)
      .maybeSingle();

    if (pickupErr) throw pickupErr;
    if (!pickupRow) {
      return { success: false, error: "Pickup date not found" };
    }
    const pickup = pickupRow as PickupDateRow;
    if (!pickup.is_open) {
      return { success: false, error: "Pickup date is closed" };
    }
    if (new Date(pickup.cutoff_at).getTime() < Date.now()) {
      return { success: false, error: "Pickup cutoff passed" };
    }

    const subtotal = round(
      input.cart.reduce((s, l) => s + l.unit_price * l.quantity, 0)
    );
    const totalLbs = round(
      input.cart
        .filter((l) => l.unit === "lb")
        .reduce((s, l) => s + l.quantity, 0)
    );
    const tip = round(input.tip || 0);
    const total = round(subtotal + tip);

    const capacityRemaining = pickup.capacity_lbs - pickup.reserved_lbs;
    if (totalLbs > capacityRemaining) {
      return {
        success: false,
        error: `Not enough capacity (${capacityRemaining} lbs remaining)`,
      };
    }

    // Map payment method
    let payment_method: PaymentMethod | null = null;
    let payment_status: PaymentStatus = "unpaid";
    let deposit_paid = 0;
    let balance_remaining = total;

    if (input.paymentMethod === "pay_in_full") {
      payment_method = "stripe";
      // Stripe not wired — mark unpaid; webhook will update
      payment_status = "unpaid";
    } else if (input.paymentMethod === "deposit_50") {
      payment_method = "stripe";
      payment_status = "unpaid";
      deposit_paid = 0;
      balance_remaining = total;
    } else {
      payment_method = "cash";
      payment_status = "unpaid";
    }

    // Insert order — let DB generate order_number via default
    const orderInsert = {
      customer_id: input.isGuest ? null : authUser?.id ?? null,
      guest_name: input.isGuest ? input.customerInfo.name : null,
      guest_phone: input.isGuest ? input.customerInfo.phone : null,
      guest_email: input.isGuest ? input.customerInfo.email ?? null : null,
      pickup_date_id: pickup.id,
      pickup_date: pickup.pickup_date,
      subtotal,
      tip,
      total,
      deposit_paid,
      balance_remaining,
      total_lbs: totalLbs,
      status: "pending" as const,
      payment_method,
      payment_status,
      notes: input.notes ?? null,
    };

    const { data: inserted, error: orderErr } = await db
      .from("orders")
      .insert(orderInsert)
      .select("*")
      .single();

    if (orderErr) throw orderErr;
    const order = inserted as OrderRow;

    // Insert order_items
    const itemsInsert = input.cart.map((l) => ({
      order_id: order.id,
      menu_item_id: l.menu_item_id,
      variant_id: l.variant_id ?? null,
      name_snapshot_en: l.name_en,
      name_snapshot_es: l.name_es,
      variant_snapshot: l.variant_name_en ?? null,
      quantity: l.quantity,
      unit: l.unit,
      unit_price_snapshot: l.unit_price,
      line_total: round(l.unit_price * l.quantity),
      notes: l.notes ?? null,
    }));

    const { error: itemsErr } = await db.from("order_items").insert(itemsInsert);
    if (itemsErr) throw itemsErr;

    // Fire the order-receipt email. Non-blocking on error — we never fail an
    // order because an email couldn't go out.
    try {
      await sendOrderReceipt(order.order_number);
    } catch (emailErr) {
      console.error(
        "[orders.createOrder] sendOrderReceipt failed:",
        emailErr,
      );
    }

    return {
      success: true,
      orderNumber: order.order_number,
      data: { orderNumber: order.order_number, orderId: order.id },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create order",
    };
  }
}

export async function cancelOrder(orderId: string): Promise<OrderActionResult> {
  try {
    const db = await createServerSupabaseClient();
    const { error } = await db
      .from("orders")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed",
    };
  }
}

export interface OrderWithDetails extends OrderRow {
  items: OrderItemRow[];
  pickup: PickupDateRow | null;
}

export async function getOrder(
  orderNumber: string
): Promise<OrderActionResult<OrderWithDetails>> {
  try {
    const db = await createServerSupabaseClient();
    const { data: order, error } = await db
      .from("orders")
      .select("*")
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (error) throw error;
    if (!order) return { success: false, error: "Order not found" };

    const [{ data: items }, { data: pickup }] = await Promise.all([
      db.from("order_items").select("*").eq("order_id", order.id),
      db
        .from("pickup_dates")
        .select("*")
        .eq("id", order.pickup_date_id)
        .maybeSingle(),
    ]);

    return {
      success: true,
      data: {
        ...(order as OrderRow),
        items: (items as OrderItemRow[]) ?? [],
        pickup: (pickup as PickupDateRow | null) ?? null,
      },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed",
    };
  }
}

export async function trackGuestOrder(
  orderNumber: string,
  phone: string
): Promise<OrderActionResult<OrderWithDetails>> {
  try {
    const db = createServiceRoleClient();
    const { data: order, error } = await db
      .from("orders")
      .select("*")
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (error) throw error;
    if (!order) return { success: false, error: "Not found" };

    // Normalize phones for comparison (strip non-digits)
    const norm = (p: string | null | undefined) =>
      (p ?? "").replace(/\D+/g, "");
    if (norm(order.guest_phone) !== norm(phone) || !order.guest_phone) {
      return { success: false, error: "Phone does not match" };
    }

    const [{ data: items }, { data: pickup }] = await Promise.all([
      db.from("order_items").select("*").eq("order_id", order.id),
      db
        .from("pickup_dates")
        .select("*")
        .eq("id", order.pickup_date_id)
        .maybeSingle(),
    ]);

    return {
      success: true,
      data: {
        ...(order as OrderRow),
        items: (items as OrderItemRow[]) ?? [],
        pickup: (pickup as PickupDateRow | null) ?? null,
      },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed",
    };
  }
}

export async function listMyOrders(): Promise<OrderActionResult<OrderRow[]>> {
  try {
    const db = await createServerSupabaseClient();
    const { data: userRes } = await db.auth.getUser();
    if (!userRes.user) {
      return { success: false, error: "Not signed in" };
    }
    const { data, error } = await db
      .from("orders")
      .select("*")
      .eq("customer_id", userRes.user.id)
      .order("pickup_date", { ascending: false });
    if (error) throw error;
    return { success: true, data: (data as OrderRow[]) ?? [] };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed",
    };
  }
}
