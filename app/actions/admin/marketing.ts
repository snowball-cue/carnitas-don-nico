"use server";

import "server-only";
import * as React from "react";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/checkAdmin";
import { sendEmail } from "@/lib/email/send";
import { encodeToken } from "@/lib/unsubscribe";
import MarketingBroadcast from "@/lib/email/templates/MarketingBroadcast";
import { getAppUrl } from "@/lib/email/templates/_shared";
import { sanitizeMarketingHtml } from "@/lib/email/sanitizeMarketing";
import type {
  ActionResult,
} from "./orders";
import type {
  BroadcastLocale,
  BroadcastStatus,
  GroupColor,
  Json,
} from "@/types/database";

// =============================================================================
// Types (server action boundary friendly — plain objects)
// =============================================================================

export interface ContactRow {
  /** Stable key for UI. Auth users → "u:<id>"; guests → "g:<email>". */
  key: string;
  email: string;
  name: string | null;
  phone: string | null;
  is_customer: boolean;
  customer_id: string | null;
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
  marketing_opt_in: boolean;
  unsubscribed: boolean;
  group_ids: string[];
  is_catering_prospect: boolean;
}

export interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  color: string;
  member_count: number;
  created_at: string;
}

export interface ResolvedRecipient {
  email: string;
  name: string | null;
  customer_id: string | null;
}

export type SmartSegment =
  | "new"
  | "recurring"
  | "vip"
  | "catering_prospect"
  | "marketing_opt_in";

export interface RecipientFilter {
  all?: boolean;
  groupIds?: string[];
  smartSegments?: SmartSegment[];
  /** stable keys (as in ContactRow.key) OR raw emails */
  individualContactKeys?: string[];
}

// =============================================================================
// Internal — shared contact aggregation
// =============================================================================

interface RawCustomerProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  marketing_opt_in: boolean;
}
interface RawOrder {
  customer_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  total: number | null;
  created_at: string;
  status: string;
}
interface RawMembership {
  group_id: string;
  customer_id: string | null;
  email: string | null;
}

function isExcludedStatus(s: string) {
  return s === "cancelled" || s === "no_show";
}

async function loadContactsInternal(): Promise<ContactRow[]> {
  const svc = createServiceRoleClient();

  const [profilesRes, ordersRes, unsubRes, membershipsRes, cateringRes] =
    await Promise.all([
      svc
        .from("customer_profiles")
        .select("id, full_name, phone, email, marketing_opt_in")
        .limit(5000),
      svc
        .from("orders")
        .select(
          "customer_id, guest_name, guest_email, guest_phone, total, created_at, status",
        )
        .limit(20000),
      svc.from("unsubscribed_emails").select("email").limit(10000),
      svc
        .from("customer_group_memberships")
        .select("group_id, customer_id, email")
        .limit(20000),
      svc.from("catering_requests").select("email").limit(5000),
    ]);

  const profiles = (profilesRes.data ?? []) as RawCustomerProfile[];
  const orders = (ordersRes.data ?? []) as RawOrder[];
  const unsubSet = new Set<string>(
    ((unsubRes.data ?? []) as { email: string }[]).map((r) =>
      r.email.toLowerCase(),
    ),
  );
  const memberships = (membershipsRes.data ?? []) as RawMembership[];
  const cateringSet = new Set<string>(
    ((cateringRes.data ?? []) as { email: string | null }[])
      .map((r) => (r.email ?? "").toLowerCase())
      .filter(Boolean),
  );

  // Index profiles by id and by email
  const profileById = new Map<string, RawCustomerProfile>();
  const emailToProfileId = new Map<string, string>();
  for (const p of profiles) {
    profileById.set(p.id, p);
    if (p.email) emailToProfileId.set(p.email.toLowerCase(), p.id);
  }

  // Aggregate order stats per customer_id and per guest email
  interface Stats {
    count: number;
    spent: number;
    lastAt: string | null;
    name: string | null;
    phone: string | null;
  }
  const byCustomerId = new Map<string, Stats>();
  const byGuestEmail = new Map<string, Stats>();

  for (const o of orders) {
    if (isExcludedStatus(o.status)) continue;
    const total = Number(o.total ?? 0);
    if (o.customer_id) {
      const s = byCustomerId.get(o.customer_id) ?? {
        count: 0,
        spent: 0,
        lastAt: null,
        name: null,
        phone: null,
      };
      s.count += 1;
      s.spent += total;
      if (!s.lastAt || o.created_at > s.lastAt) s.lastAt = o.created_at;
      byCustomerId.set(o.customer_id, s);
    } else if (o.guest_email) {
      const key = o.guest_email.toLowerCase();
      // If this guest email belongs to a known auth user, roll into that user
      const ownerId = emailToProfileId.get(key);
      if (ownerId) {
        const s = byCustomerId.get(ownerId) ?? {
          count: 0,
          spent: 0,
          lastAt: null,
          name: null,
          phone: null,
        };
        s.count += 1;
        s.spent += total;
        if (!s.lastAt || o.created_at > s.lastAt) s.lastAt = o.created_at;
        byCustomerId.set(ownerId, s);
      } else {
        const s = byGuestEmail.get(key) ?? {
          count: 0,
          spent: 0,
          lastAt: null,
          name: o.guest_name ?? null,
          phone: o.guest_phone ?? null,
        };
        s.count += 1;
        s.spent += total;
        if (!s.lastAt || o.created_at > s.lastAt) s.lastAt = o.created_at;
        if (!s.name && o.guest_name) s.name = o.guest_name;
        if (!s.phone && o.guest_phone) s.phone = o.guest_phone;
        byGuestEmail.set(key, s);
      }
    }
  }

  // Group membership index: by customer_id and by email
  const groupsByCustomer = new Map<string, string[]>();
  const groupsByEmail = new Map<string, string[]>();
  for (const m of memberships) {
    if (m.customer_id) {
      const list = groupsByCustomer.get(m.customer_id) ?? [];
      list.push(m.group_id);
      groupsByCustomer.set(m.customer_id, list);
    } else if (m.email) {
      const key = m.email.toLowerCase();
      const list = groupsByEmail.get(key) ?? [];
      list.push(m.group_id);
      groupsByEmail.set(key, list);
    }
  }

  const rows: ContactRow[] = [];

  // 1. Authenticated customers
  for (const p of profiles) {
    const emailLower = p.email?.toLowerCase() ?? "";
    if (!emailLower) continue; // no email = can't broadcast
    const s = byCustomerId.get(p.id);
    rows.push({
      key: `u:${p.id}`,
      email: p.email ?? "",
      name: p.full_name,
      phone: p.phone,
      is_customer: true,
      customer_id: p.id,
      order_count: s?.count ?? 0,
      total_spent: Number((s?.spent ?? 0).toFixed(2)),
      last_order_at: s?.lastAt ?? null,
      marketing_opt_in: p.marketing_opt_in,
      unsubscribed: unsubSet.has(emailLower),
      group_ids: groupsByCustomer.get(p.id) ?? [],
      is_catering_prospect: cateringSet.has(emailLower),
    });
  }

  // 2. Guest emails (not matching any auth user)
  for (const [emailLower, s] of byGuestEmail.entries()) {
    rows.push({
      key: `g:${emailLower}`,
      email: emailLower,
      name: s.name,
      phone: s.phone,
      is_customer: false,
      customer_id: null,
      order_count: s.count,
      total_spent: Number(s.spent.toFixed(2)),
      last_order_at: s.lastAt,
      marketing_opt_in: true, // guests provided email at checkout
      unsubscribed: unsubSet.has(emailLower),
      group_ids: groupsByEmail.get(emailLower) ?? [],
      is_catering_prospect: cateringSet.has(emailLower),
    });
  }

  // Stable sort: highest spend first, fallback recent order
  rows.sort(
    (a, b) =>
      b.total_spent - a.total_spent ||
      (b.last_order_at ?? "").localeCompare(a.last_order_at ?? ""),
  );

  return rows;
}

// =============================================================================
// Public server actions
// =============================================================================

export async function listContacts(): Promise<ActionResult<ContactRow[]>> {
  try {
    await requireAdmin();
    const rows = await loadContactsInternal();
    return { success: true, data: rows };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to load contacts",
    };
  }
}

export async function listGroups(): Promise<ActionResult<GroupRow[]>> {
  try {
    await requireAdmin();
    const svc = createServiceRoleClient();
    const [groupsRes, membersRes] = await Promise.all([
      svc
        .from("customer_groups")
        .select("id, name, description, color, created_at")
        .order("name"),
      svc
        .from("customer_group_memberships")
        .select("group_id")
        .limit(50000),
    ]);
    if (groupsRes.error) throw groupsRes.error;

    const countByGroup = new Map<string, number>();
    for (const m of (membersRes.data ?? []) as { group_id: string }[]) {
      countByGroup.set(m.group_id, (countByGroup.get(m.group_id) ?? 0) + 1);
    }
    const out: GroupRow[] = ((groupsRes.data ?? []) as Array<{
      id: string;
      name: string;
      description: string | null;
      color: string;
      created_at: string;
    }>).map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      color: g.color ?? "oro",
      member_count: countByGroup.get(g.id) ?? 0,
      created_at: g.created_at,
    }));
    return { success: true, data: out };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to load groups",
    };
  }
}

export async function createGroup(input: {
  name: string;
  description?: string | null;
  color?: GroupColor | string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const name = input.name.trim();
    if (!name) return { success: false, error: "Name required" };
    const svc = createServiceRoleClient();
    const { data, error } = await svc
      .from("customer_groups")
      .insert({
        name,
        description: input.description ?? null,
        color: input.color ?? "oro",
      })
      .select("id")
      .single();
    if (error) throw error;
    revalidatePath("/admin/groups");
    return { success: true, data: { id: data.id } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create group",
    };
  }
}

export async function updateGroup(
  id: string,
  patch: { name?: string; description?: string | null; color?: string },
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const svc = createServiceRoleClient();
    const { error } = await svc
      .from("customer_groups")
      .update(patch)
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/groups");
    revalidatePath(`/admin/groups/${id}`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update group",
    };
  }
}

export async function deleteGroup(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const svc = createServiceRoleClient();
    const { error } = await svc.from("customer_groups").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/groups");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete group",
    };
  }
}

export async function addToGroup(input: {
  group_id: string;
  customer_id?: string | null;
  email?: string | null;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
    const hasCustomer = Boolean(input.customer_id);
    const hasEmail = Boolean(input.email);
    if (hasCustomer === hasEmail) {
      return {
        success: false,
        error: "Provide exactly one of customer_id or email",
      };
    }
    const svc = createServiceRoleClient();
    const { error } = await svc.from("customer_group_memberships").insert({
      group_id: input.group_id,
      customer_id: hasCustomer ? input.customer_id! : null,
      email: hasEmail ? input.email!.toLowerCase().trim() : null,
    });
    // Ignore unique violation — already a member
    if (error && !String(error.message).toLowerCase().includes("duplicate")) {
      throw error;
    }
    revalidatePath("/admin/groups");
    revalidatePath(`/admin/groups/${input.group_id}`);
    revalidatePath("/admin/contacts");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to add to group",
    };
  }
}

export async function removeFromGroup(input: {
  group_id: string;
  customer_id?: string | null;
  email?: string | null;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
    const svc = createServiceRoleClient();
    let q = svc
      .from("customer_group_memberships")
      .delete()
      .eq("group_id", input.group_id);
    if (input.customer_id) q = q.eq("customer_id", input.customer_id);
    else if (input.email) q = q.eq("email", input.email.toLowerCase().trim());
    else return { success: false, error: "Missing identifier" };
    const { error } = await q;
    if (error) throw error;
    revalidatePath("/admin/groups");
    revalidatePath(`/admin/groups/${input.group_id}`);
    revalidatePath("/admin/contacts");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to remove from group",
    };
  }
}

export async function resolveRecipients(
  filter: RecipientFilter,
): Promise<ActionResult<ResolvedRecipient[]>> {
  try {
    await requireAdmin();
    const rows = await loadContactsInternal();
    const groupIdSet = new Set(filter.groupIds ?? []);
    const segmentSet = new Set(filter.smartSegments ?? []);
    const individualSet = new Set(
      (filter.individualContactKeys ?? []).map((k) => k.toLowerCase()),
    );

    const picked: ResolvedRecipient[] = [];
    const seenEmails = new Set<string>();

    for (const r of rows) {
      const emailLower = r.email.toLowerCase();
      if (!emailLower || r.unsubscribed) continue;

      let include = false;

      if (filter.all) {
        include = true;
      }
      if (!include && filter.groupIds?.length) {
        if (r.group_ids.some((g) => groupIdSet.has(g))) include = true;
      }
      if (!include && filter.smartSegments?.length) {
        if (segmentSet.has("new") && r.order_count === 1) include = true;
        if (!include && segmentSet.has("recurring") && r.order_count >= 2)
          include = true;
        if (
          !include &&
          segmentSet.has("vip") &&
          (r.order_count >= 5 || r.total_spent >= 200)
        )
          include = true;
        if (
          !include &&
          segmentSet.has("catering_prospect") &&
          r.is_catering_prospect
        )
          include = true;
        if (
          !include &&
          segmentSet.has("marketing_opt_in") &&
          r.marketing_opt_in
        )
          include = true;
      }
      if (!include && filter.individualContactKeys?.length) {
        if (
          individualSet.has(r.key.toLowerCase()) ||
          individualSet.has(emailLower)
        )
          include = true;
      }

      if (include && !seenEmails.has(emailLower)) {
        seenEmails.add(emailLower);
        picked.push({
          email: r.email,
          name: r.name,
          customer_id: r.customer_id,
        });
      }
    }

    return { success: true, data: picked };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to resolve recipients",
    };
  }
}

// -----------------------------------------------------------------------------
// Broadcast CRUD + send
// -----------------------------------------------------------------------------

export interface CreateBroadcastInput {
  subject: string;
  body_html: string; // pre-sanitized OR raw markdown — we sanitize again
  body_text?: string | null;
  locale: BroadcastLocale;
  recipient_filter: RecipientFilter;
}

export async function createBroadcast(
  input: CreateBroadcastInput,
): Promise<ActionResult<{ id: string; total_recipients: number }>> {
  try {
    const { userId } = await requireAdmin();
    if (!input.subject.trim()) {
      return { success: false, error: "Subject required" };
    }
    if (!input.body_html.trim()) {
      return { success: false, error: "Body required" };
    }

    const resolved = await resolveRecipients(input.recipient_filter);
    if (!resolved.success || !resolved.data) {
      return {
        success: false,
        error: resolved.error ?? "Failed to resolve recipients",
      };
    }
    const recipients = resolved.data;

    const sanitized = sanitizeMarketingHtml(input.body_html);
    const svc = createServiceRoleClient();
    const { data: campaign, error } = await svc
      .from("broadcast_campaigns")
      .insert({
        subject: input.subject.trim(),
        body_html: sanitized,
        body_text: input.body_text ?? null,
        locale: input.locale,
        status: "draft" as BroadcastStatus,
        total_recipients: recipients.length,
        recipient_filter: input.recipient_filter as unknown as Json,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw error;

    if (recipients.length > 0) {
      // Batch-insert recipient rows (chunked to stay under Supabase REST limits)
      const chunkSize = 500;
      for (let i = 0; i < recipients.length; i += chunkSize) {
        const chunk = recipients.slice(i, i + chunkSize).map((r) => ({
          campaign_id: campaign.id,
          email: r.email.toLowerCase().trim(),
          name: r.name,
          customer_id: r.customer_id,
          status: "pending" as const,
        }));
        const { error: insErr } = await svc
          .from("broadcast_recipients")
          .insert(chunk);
        if (insErr) throw insErr;
      }
    }

    revalidatePath("/admin/broadcasts");
    return {
      success: true,
      data: { id: campaign.id, total_recipients: recipients.length },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create broadcast",
    };
  }
}

function isResendTestMode(): boolean {
  const from = process.env.RESEND_FROM || "Carnitas Don Nico <onboarding@resend.dev>";
  return from.toLowerCase().includes("onboarding@resend.dev");
}

const TEST_MODE_RECIPIENT_CAP = 50;

function firstNameFromFull(name: string | null): string {
  if (!name) return "";
  return name.trim().split(/\s+/)[0] ?? "";
}

export async function sendBroadcast(
  campaignId: string,
): Promise<ActionResult<{ delivered: number; failed: number; skipped: number }>> {
  try {
    await requireAdmin();
    const svc = createServiceRoleClient();

    const { data: campaign, error: cErr } = await svc
      .from("broadcast_campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!campaign) return { success: false, error: "Campaign not found" };
    if (campaign.status !== "draft" && campaign.status !== "failed") {
      return {
        success: false,
        error: `Campaign already ${campaign.status}`,
      };
    }

    await svc
      .from("broadcast_campaigns")
      .update({
        status: "sending" as BroadcastStatus,
        started_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    // Pull unsubscribed set fresh in case anything changed
    const { data: unsubRows } = await svc
      .from("unsubscribed_emails")
      .select("email")
      .limit(20000);
    const unsubSet = new Set<string>(
      ((unsubRows ?? []) as { email: string }[]).map((r) =>
        r.email.toLowerCase(),
      ),
    );

    const replyTo =
      process.env.RESEND_REPLY_TO || "carnitasdonnico25@gmail.com";
    const appUrl = getAppUrl();

    // Fetch recipients in batches of 100 and process per-recipient.
    const batchSize = 100;
    let delivered = 0;
    let failed = 0;
    let skipped = 0;
    let processedInTestMode = 0;
    const testMode = isResendTestMode();

    let offset = 0;
    while (true) {
      const { data: recipients, error: rErr } = await svc
        .from("broadcast_recipients")
        .select("id, email, name, customer_id, status")
        .eq("campaign_id", campaignId)
        .eq("status", "pending")
        .order("id")
        .range(offset, offset + batchSize - 1);
      if (rErr) throw rErr;
      const chunk = (recipients ?? []) as Array<{
        id: string;
        email: string;
        name: string | null;
        customer_id: string | null;
        status: string;
      }>;
      if (chunk.length === 0) break;

      for (const r of chunk) {
        const emailLower = r.email.toLowerCase();

        // Unsubscribed?
        if (unsubSet.has(emailLower)) {
          await svc
            .from("broadcast_recipients")
            .update({
              status: "skipped_unsubscribed" as const,
              sent_at: new Date().toISOString(),
            })
            .eq("id", r.id);
          skipped += 1;
          continue;
        }

        // Test-mode cap: prevent bursting past Resend daily limit
        if (testMode && processedInTestMode >= TEST_MODE_RECIPIENT_CAP) {
          await svc
            .from("broadcast_recipients")
            .update({
              status: "skipped_test_mode" as const,
              sent_at: new Date().toISOString(),
              error: "test_mode_cap",
            })
            .eq("id", r.id);
          skipped += 1;
          continue;
        }

        const unsubToken = encodeToken(r.email);
        const unsubscribeUrl = `${appUrl}/unsubscribe?token=${unsubToken}`;

        const react = React.createElement(MarketingBroadcast, {
          locale: campaign.locale as BroadcastLocale,
          subject: campaign.subject,
          firstName: firstNameFromFull(r.name),
          bodyHtml: campaign.body_html,
          unsubscribeUrl,
          replyTo,
        });

        const result = await sendEmail({
          to: r.email,
          subject: campaign.subject,
          react,
          replyTo,
        });

        if (testMode) processedInTestMode += 1;

        if (result.skipped) {
          await svc
            .from("broadcast_recipients")
            .update({
              status: "skipped_test_mode" as const,
              sent_at: new Date().toISOString(),
              error: result.reason ?? "test_mode",
            })
            .eq("id", r.id);
          skipped += 1;
        } else if (result.sent) {
          await svc
            .from("broadcast_recipients")
            .update({
              status: "sent" as const,
              resend_id: result.id ?? null,
              sent_at: new Date().toISOString(),
            })
            .eq("id", r.id);
          delivered += 1;
        } else {
          await svc
            .from("broadcast_recipients")
            .update({
              status: "failed" as const,
              error: result.error ?? "unknown",
              sent_at: new Date().toISOString(),
            })
            .eq("id", r.id);
          failed += 1;
        }
      }

      offset += chunk.length;
      if (chunk.length < batchSize) break;
      // tiny pause between batches to avoid hammering Resend
      await new Promise((res) => setTimeout(res, 250));
    }

    const finalStatus: BroadcastStatus =
      delivered === 0 && failed > 0 ? "failed" : "sent";
    await svc
      .from("broadcast_campaigns")
      .update({
        status: finalStatus,
        delivered_count: delivered,
        failed_count: failed,
        finished_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    revalidatePath("/admin/broadcasts");
    revalidatePath(`/admin/broadcasts/${campaignId}`);
    return { success: true, data: { delivered, failed, skipped } };
  } catch (e) {
    const svc = createServiceRoleClient();
    try {
      await svc
        .from("broadcast_campaigns")
        .update({
          status: "failed" as BroadcastStatus,
          finished_at: new Date().toISOString(),
        })
        .eq("id", campaignId);
    } catch {}
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to send broadcast",
    };
  }
}

/**
 * Public unsubscribe action (NOT admin-gated). Callable from the public
 * /unsubscribe page. Uses service-role to insert into an RLS-protected table
 * but the migration also has a permissive INSERT policy for defense-in-depth.
 */
export async function unsubscribeEmail(
  email: string,
  source: string = "one_click",
): Promise<ActionResult> {
  try {
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      return { success: false, error: "Invalid email" };
    }
    const svc = createServiceRoleClient();
    const { error } = await svc
      .from("unsubscribed_emails")
      .upsert(
        {
          email: clean,
          source,
          unsubscribed_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      );
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to unsubscribe",
    };
  }
}
