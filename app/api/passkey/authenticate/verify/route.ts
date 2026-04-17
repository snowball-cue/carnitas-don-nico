import { NextResponse } from "next/server";
import { verifyAuthentication } from "@/lib/auth/passkeys";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await verifyAuthentication(body.response, body.email ?? null);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "verification_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
