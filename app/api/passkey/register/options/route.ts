import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateRegistrationOptionsForUser } from "@/lib/auth/passkeys";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const options = await generateRegistrationOptionsForUser(user);
    return NextResponse.json({ options });
  } catch (err) {
    const message = err instanceof Error ? err.message : "registration_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
