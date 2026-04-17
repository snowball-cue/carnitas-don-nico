/**
 * Base64url-encoded unsubscribe token.
 *
 * Encodes `{ e: email, t: Date.now() }` — not cryptographically signed.
 * Worst-case exposure is that a bored attacker unsubscribes random emails
 * (annoying, recoverable by admin — `unsubscribed_emails` is a plain table).
 *
 * Usable from both server and client (uses Buffer on server, btoa/atob on client).
 */

function toBase64Url(input: string): string {
  // In Node/server, Buffer is always available. In the browser, use btoa.
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  const b64 = btoa(unescape(encodeURIComponent(input)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const padded =
    input.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (input.length % 4)) % 4);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf8");
  }
  return decodeURIComponent(escape(atob(padded)));
}

export function encodeToken(email: string): string {
  const payload = JSON.stringify({ e: email.toLowerCase().trim(), t: Date.now() });
  return toBase64Url(payload);
}

export interface UnsubscribeTokenPayload {
  email: string;
  issuedAt: number;
}

export function decodeToken(token: string): UnsubscribeTokenPayload | null {
  try {
    const json = fromBase64Url(token);
    const obj = JSON.parse(json) as { e?: unknown; t?: unknown };
    if (typeof obj.e !== "string" || !obj.e) return null;
    const t = typeof obj.t === "number" ? obj.t : 0;
    return { email: obj.e.toLowerCase().trim(), issuedAt: t };
  } catch {
    return null;
  }
}
