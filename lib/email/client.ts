import "server-only";

import { Resend } from "resend";

/**
 * Lazy singleton Resend client.
 * Reads RESEND_API_KEY at call time — NEVER at module load — so that
 * missing env during build/import doesn't crash the server.
 */
let _client: Resend | null = null;

export function getResend(): Resend {
  if (_client) return _client;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to .env.local (and Vercel env).",
    );
  }
  _client = new Resend(key);
  return _client;
}
