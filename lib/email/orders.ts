import "server-only";

import * as React from "react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type {
  OrderRow,
  OrderItemRow,
  PickupDateRow,
  CustomerProfileRow,
} from "@/types/database";
import OrderReceipt, {
  type OrderReceiptItem,
} from "./templates/OrderReceipt";
import PickupReminder from "./templates/PickupReminder";
import PickupConfirmation from "./templates/PickupConfirmation";
import { generateQrDataUrl } from "./qr";
import { sendEmail, type SendEmailResult } from "./send";
import { getAppUrl, type Locale } from "./templates/_shared";

const OWNER_EMAIL_FALLBACK = "carnitasdonnico25@gmail.com";

/** customer_profiles row may carry preferred_language even if not in typegen yet. */
type ProfileWithLang = CustomerProfileRow & {
  preferred_language?: "en" | "es" | null;
};

interface OrderBundle {
  order: OrderRow;
  items: OrderItemRow[];
  pickup: PickupDateRow | null;
  profile: ProfileWithLang | null;
}

async function loadOrderBundle(
  orderNumber: string,
): Promise<OrderBundle | null> {
  const db = createServiceRoleClient();

  const { data: orderRaw, error: orderErr } = await db
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (orderErr || !orderRaw) {
    if (orderErr) console.error("[email] loadOrderBundle order error:", orderErr);
    return null;
  }
  const order = orderRaw as OrderRow;

  const [itemsRes, pickupRes, profileRes] = await Promise.all([
    db.from("order_items").select("*").eq("order_id", order.id),
    order.pickup_date_id
      ? db
          .from("pickup_dates")
          .select("*")
          .eq("id", order.pickup_date_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    order.customer_id
      ? db
          .from("customer_profiles")
          .select("*")
          .eq("id", order.customer_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  return {
    order,
    items: (itemsRes.data as OrderItemRow[] | null) ?? [],
    pickup: (pickupRes.data as PickupDateRow | null) ?? null,
    profile: (profileRes.data as ProfileWithLang | null) ?? null,
  };
}

function resolveRecipient(bundle: OrderBundle): {
  email: string | null;
  name: string;
  locale: Locale;
} {
  const email =
    bundle.profile?.email ?? bundle.order.guest_email ?? null;
  const name =
    bundle.profile?.full_name ??
    bundle.order.guest_name ??
    (bundle.profile?.email?.split("@")[0] ?? "amigo");
  const locale: Locale =
    bundle.profile?.preferred_language === "en" ? "en" : "es";
  return { email, name, locale };
}

function buildTrackUrl(order: OrderRow): string {
  const app = getAppUrl();
  if (order.customer_id) {
    return `${app}/orders/${order.order_number}`;
  }
  const phone = (order.guest_phone ?? "").replace(/\D+/g, "");
  return `${app}/orders/track/${order.order_number}?phone=${encodeURIComponent(phone)}`;
}

function mapItems(items: OrderItemRow[], locale: Locale): OrderReceiptItem[] {
  return items.map((it) => ({
    name:
      locale === "es"
        ? it.name_snapshot_es || it.name_snapshot_en
        : it.name_snapshot_en,
    variant: it.variant_snapshot,
    quantity: Number(it.quantity),
    unit: it.unit,
    lineTotal: Number(it.line_total),
  }));
}

/**
 * Send the order-receipt email. Sends to the customer (BCC: OWNER_EMAIL).
 * Never throws — logs and returns a status object.
 */
export async function sendOrderReceipt(
  orderNumber: string,
): Promise<SendEmailResult> {
  try {
    const bundle = await loadOrderBundle(orderNumber);
    if (!bundle) {
      console.warn(`[email] sendOrderReceipt: order ${orderNumber} not found`);
      return { sent: false, error: "order_not_found" };
    }
    const { email, name, locale } = resolveRecipient(bundle);
    if (!email) {
      console.warn(
        `[email] sendOrderReceipt: no customer email on ${orderNumber}; skipping`,
      );
      return { sent: false, skipped: true, reason: "no_email" };
    }

    const trackUrl = buildTrackUrl(bundle.order);
    const qrDataUrl = await generateQrDataUrl(trackUrl);

    const pickupDateStr = bundle.order.pickup_date;
    const subjectDate = formatSubjectDate(pickupDateStr, locale);
    const subject =
      locale === "es"
        ? `\u2713 Pedido confirmado — ${orderNumber} para el sábado, ${subjectDate}`
        : `\u2713 Order confirmed — ${orderNumber} for Saturday, ${subjectDate}`;

    const react = React.createElement(OrderReceipt, {
      locale,
      orderNumber,
      customerName: name,
      items: mapItems(bundle.items, locale),
      subtotal: Number(bundle.order.subtotal),
      tip: Number(bundle.order.tip ?? 0),
      total: Number(bundle.order.total),
      depositPaid: Number(bundle.order.deposit_paid ?? 0),
      balance: Number(bundle.order.balance_remaining ?? bundle.order.total),
      pickupDate: pickupDateStr,
      pickupWindowStart: bundle.pickup?.pickup_window_start ?? null,
      pickupWindowEnd: bundle.pickup?.pickup_window_end ?? null,
      trackUrl,
      qrDataUrl,
    });

    const owner = process.env.OWNER_EMAIL || OWNER_EMAIL_FALLBACK;

    return await sendEmail({
      to: email,
      subject,
      react,
      bcc: owner,
    });
  } catch (e) {
    console.error("[email] sendOrderReceipt threw:", e);
    return {
      sent: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Send the 24h-before pickup reminder. Customer-only.
 */
export async function sendPickupReminder(
  orderNumber: string,
): Promise<SendEmailResult> {
  try {
    const bundle = await loadOrderBundle(orderNumber);
    if (!bundle) {
      console.warn(`[email] sendPickupReminder: order ${orderNumber} not found`);
      return { sent: false, error: "order_not_found" };
    }
    const { email, name, locale } = resolveRecipient(bundle);
    if (!email) {
      console.warn(
        `[email] sendPickupReminder: no customer email on ${orderNumber}; skipping`,
      );
      return { sent: false, skipped: true, reason: "no_email" };
    }

    const trackUrl = buildTrackUrl(bundle.order);
    const qrDataUrl = await generateQrDataUrl(trackUrl);
    const mapUrl =
      process.env.NEXT_PUBLIC_PICKUP_LOCATION_URL ||
      "https://maps.google.com/?q=TBD"; // TODO: set NEXT_PUBLIC_PICKUP_LOCATION_URL

    const subject =
      locale === "es"
        ? `Mañana recoges tu pedido — ${orderNumber}`
        : `Tomorrow is pickup day — ${orderNumber}`;

    const react = React.createElement(PickupReminder, {
      locale,
      orderNumber,
      customerName: name,
      pickupDate: bundle.order.pickup_date,
      pickupWindowStart: bundle.pickup?.pickup_window_start ?? null,
      pickupWindowEnd: bundle.pickup?.pickup_window_end ?? null,
      balance: Number(bundle.order.balance_remaining ?? 0),
      trackUrl,
      qrDataUrl,
      mapUrl,
    });

    return await sendEmail({
      to: email,
      subject,
      react,
    });
  } catch (e) {
    console.error("[email] sendPickupReminder threw:", e);
    return {
      sent: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Send the post-pickup thank-you / referral email. Customer-only.
 */
export async function sendPickupConfirmation(
  orderNumber: string,
): Promise<SendEmailResult> {
  try {
    const bundle = await loadOrderBundle(orderNumber);
    if (!bundle) {
      console.warn(
        `[email] sendPickupConfirmation: order ${orderNumber} not found`,
      );
      return { sent: false, error: "order_not_found" };
    }
    const { email, name, locale } = resolveRecipient(bundle);
    if (!email) {
      console.warn(
        `[email] sendPickupConfirmation: no customer email on ${orderNumber}; skipping`,
      );
      return { sent: false, skipped: true, reason: "no_email" };
    }

    const app = getAppUrl();
    // TODO(review-page): replace with /orders/:n/review when review page exists
    const reviewUrl = `${app}/?review=${encodeURIComponent(orderNumber)}`;

    // Referral code: prefer profile's; for guests, synthesize a friendly code
    // from the order number so the email still feels personal.
    const referralCode =
      bundle.profile?.referral_code ??
      `NICO-${orderNumber.replace(/[^A-Z0-9]/gi, "").slice(-6).toUpperCase()}`;
    const referralUrl = `${app}/?ref=${encodeURIComponent(referralCode)}`;

    const subject =
      locale === "es"
        ? `¡Gracias por tu pedido, ${name}!`
        : `Thanks for your order, ${name}!`;

    const react = React.createElement(PickupConfirmation, {
      locale,
      orderNumber,
      customerName: name,
      total: Number(bundle.order.total),
      referralCode,
      reviewUrl,
      referralUrl,
    });

    return await sendEmail({
      to: email,
      subject,
      react,
    });
  } catch (e) {
    console.error("[email] sendPickupConfirmation threw:", e);
    return {
      sent: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function formatSubjectDate(iso: string, locale: Locale): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  try {
    return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
      month: "long",
      day: "numeric",
    }).format(date);
  } catch {
    return iso;
  }
}
