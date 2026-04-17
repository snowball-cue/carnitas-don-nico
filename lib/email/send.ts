import "server-only";

import type { ReactElement } from "react";
import { getResend } from "./client";

const DEFAULT_FROM = "Carnitas Don Nico <onboarding@resend.dev>";
const DEFAULT_REPLY_TO = "carnitasdonnico25@gmail.com";

/**
 * The Resend account email. When `RESEND_FROM` still uses the test sender
 * (`onboarding@resend.dev`), Resend only allows sending to THIS address.
 * Sends to anyone else silently fail. We short-circuit them here with a warning
 * so order-flow never breaks during test mode.
 */
const RESEND_ACCOUNT_EMAIL = "eryk.buiii@gmail.com";

export interface SendEmailArgs {
  to: string | string[];
  subject: string;
  react: ReactElement;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface SendEmailResult {
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  id?: string;
  error?: string;
}

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * Send an email via Resend. Never throws — logs and returns a status object
 * so upstream order creation never fails because of transactional email.
 */
export async function sendEmail(
  args: SendEmailArgs,
): Promise<SendEmailResult> {
  const from = process.env.RESEND_FROM || DEFAULT_FROM;
  const replyTo =
    args.replyTo || process.env.RESEND_REPLY_TO || DEFAULT_REPLY_TO;

  const toList = asArray(args.to);
  const ccList = asArray(args.cc);
  const bccList = asArray(args.bcc);

  // Test-mode guard: if using Resend's shared sender, only delivery to the
  // account owner is possible. Skip any other recipient instead of failing.
  const isTestSender = from.toLowerCase().includes("onboarding@resend.dev");
  if (isTestSender) {
    const allowed = RESEND_ACCOUNT_EMAIL.toLowerCase();
    const primaryOk = toList.some((t) => t.toLowerCase() === allowed);
    if (!primaryOk) {
      console.warn(
        `[email] TEST MODE: skipped send to ${toList.join(", ")} — ` +
          `Resend test sender (onboarding@resend.dev) can only deliver to ` +
          `${RESEND_ACCOUNT_EMAIL}. Verify a domain to enable production sends.`,
      );
      return { sent: false, skipped: true, reason: "test_mode" };
    }
    // Strip cc/bcc that aren't the account email
    const cc = ccList.filter((c) => c.toLowerCase() === allowed);
    const bcc = bccList.filter((b) => b.toLowerCase() === allowed);
    if (cc.length !== ccList.length || bcc.length !== bccList.length) {
      console.warn(
        "[email] TEST MODE: dropped non-account cc/bcc recipients.",
      );
    }
    ccList.length = 0;
    bccList.length = 0;
    ccList.push(...cc);
    bccList.push(...bcc);
  }

  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from,
      to: toList,
      subject: args.subject,
      react: args.react,
      replyTo,
      cc: ccList.length ? ccList : undefined,
      bcc: bccList.length ? bccList : undefined,
    });

    if (error) {
      console.error("[email] Resend returned error:", error);
      return { sent: false, error: error.message ?? String(error) };
    }

    return { sent: true, id: data?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[email] send failed:", msg);
    return { sent: false, error: msg };
  }
}
