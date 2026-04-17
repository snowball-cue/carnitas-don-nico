import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@/lib/auth/passkeys";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { email?: string };
    const options = await generateAuthenticationOptions(body.email ?? null);
    return NextResponse.json({ options });
  } catch (err) {
    const message = err instanceof Error ? err.message : "options_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
