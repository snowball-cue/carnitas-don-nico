/**
 * WebAuthn / Passkey server helpers.
 *
 * Uses @simplewebauthn/server for attestation + assertion verification,
 * and Supabase service-role client for challenge + credential persistence.
 *
 * Sign-in flow: on successful authentication we mint a magiclink via
 * `supabase.auth.admin.generateLink` and return the action URL to the client,
 * which then navigates to it so Supabase sets the auth cookies itself.
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions as genAuthOptionsLib,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import type { User } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/server";

// -----------------------------------------------------------------------------
// RP configuration
// -----------------------------------------------------------------------------
const RP_NAME = "Carnitas Don Nico";

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function getRpID(): string {
  try {
    const url = new URL(getAppUrl());
    return url.hostname;
  } catch {
    return "localhost";
  }
}

function getExpectedOrigin(): string {
  // Strip trailing slash.
  return getAppUrl().replace(/\/$/, "");
}

// -----------------------------------------------------------------------------
// Helpers: base64url <-> Uint8Array / Buffer
// -----------------------------------------------------------------------------
function toBase64Url(buf: Uint8Array | Buffer): string {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return new Uint8Array(Buffer.from(b64, "base64"));
}

// Supabase returns bytea as hex string like "\\x1234" or a Uint8Array depending
// on the driver. Normalise to Uint8Array.
function coercePublicKey(v: unknown): Uint8Array {
  if (v instanceof Uint8Array) return v;
  if (Buffer.isBuffer(v)) return new Uint8Array(v);
  if (typeof v === "string") {
    if (v.startsWith("\\x")) {
      return new Uint8Array(Buffer.from(v.slice(2), "hex"));
    }
    // Fallback: treat as base64
    return new Uint8Array(Buffer.from(v, "base64"));
  }
  throw new Error("Unsupported public_key storage format");
}

// -----------------------------------------------------------------------------
// Challenge persistence
// -----------------------------------------------------------------------------
async function storeChallenge(args: {
  userId?: string | null;
  email?: string | null;
  challenge: string;
  type: "registration" | "authentication";
}) {
  const supabase = createServiceRoleClient();
  await supabase.from("passkey_challenges" as never).insert({
    user_id: args.userId ?? null,
    email: args.email ?? null,
    challenge: args.challenge,
    type: args.type,
  } as never);
}

async function consumeChallenge(args: {
  userId?: string | null;
  email?: string | null;
  type: "registration" | "authentication";
}): Promise<string | null> {
  const supabase = createServiceRoleClient();
  let query = supabase
    .from("passkey_challenges" as never)
    .select("id, challenge, created_at, expires_at")
    .eq("type", args.type)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  if (args.userId) query = query.eq("user_id", args.userId);
  else if (args.email) query = query.eq("email", args.email.toLowerCase());
  else query = query.is("user_id", null).is("email", null);

  const { data } = await query.maybeSingle();
  const row = data as { id: string; challenge: string } | null;
  if (!row) return null;
  // Delete so a challenge cannot be replayed.
  await supabase.from("passkey_challenges" as never).delete().eq("id", row.id);
  return row.challenge;
}

// -----------------------------------------------------------------------------
// Registration
// -----------------------------------------------------------------------------
export async function generateRegistrationOptionsForUser(user: User) {
  const supabase = createServiceRoleClient();

  // Pull existing credentials so the authenticator knows to exclude them.
  const { data: existing } = await supabase
    .from("passkeys" as never)
    .select("credential_id, transports")
    .eq("user_id", user.id);

  const excludeCredentials = (
    (existing as { credential_id: string; transports: string[] | null }[] | null) ?? []
  ).map((c) => ({
    id: c.credential_id,
    transports: (c.transports ?? []) as AuthenticatorTransportFuture[],
  }));

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpID(),
    userID: new TextEncoder().encode(user.id),
    userName: user.email ?? user.id,
    userDisplayName:
      (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Don Nico",
    attestationType: "none",
    excludeCredentials,
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  await storeChallenge({
    userId: user.id,
    challenge: options.challenge,
    type: "registration",
  });

  return options;
}

export async function verifyRegistration(
  user: User,
  response: RegistrationResponseJSON,
  nickname?: string | null,
) {
  const expectedChallenge = await consumeChallenge({
    userId: user.id,
    type: "registration",
  });
  if (!expectedChallenge) {
    throw new Error("No valid registration challenge found (may have expired).");
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getExpectedOrigin(),
    expectedRPID: getRpID(),
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Passkey registration could not be verified.");
  }

  const info = verification.registrationInfo;
  // simplewebauthn v11 shape
  const credential = (info as unknown as {
    credential?: {
      id: string;
      publicKey: Uint8Array;
      counter: number;
      transports?: AuthenticatorTransportFuture[];
    };
  }).credential;

  // Back-compat v10-style fields, if present
  const legacy = info as unknown as {
    credentialID?: Uint8Array | string;
    credentialPublicKey?: Uint8Array;
    counter?: number;
  };

  const credentialIdRaw: string | Uint8Array =
    credential?.id ?? legacy.credentialID ?? "";
  const credentialIdB64u =
    typeof credentialIdRaw === "string"
      ? credentialIdRaw
      : toBase64Url(credentialIdRaw);
  const publicKey: Uint8Array =
    credential?.publicKey ?? legacy.credentialPublicKey ?? new Uint8Array();
  const counter = credential?.counter ?? legacy.counter ?? 0;
  const transports = (response.response.transports ?? []) as string[];
  const deviceType = info.credentialDeviceType ?? null;
  const backedUp = info.credentialBackedUp ?? false;

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("passkeys" as never).insert({
    user_id: user.id,
    credential_id: credentialIdB64u,
    // pg `bytea`: supabase-js will base64-encode Uint8Array automatically
    public_key: Buffer.from(publicKey),
    counter,
    transports,
    device_type: deviceType,
    backed_up: backedUp,
    nickname: nickname?.trim() || null,
  } as never);

  if (error) throw new Error(error.message);

  return { verified: true, credentialId: credentialIdB64u };
}

// -----------------------------------------------------------------------------
// Authentication
// -----------------------------------------------------------------------------
export async function generateAuthenticationOptions(email?: string | null) {
  const supabase = createServiceRoleClient();
  let allowCredentials:
    | { id: string; transports?: AuthenticatorTransportFuture[] }[]
    | undefined = undefined;

  const normalizedEmail = email?.trim().toLowerCase() ?? null;
  let userId: string | null = null;

  if (normalizedEmail) {
    // Find user id via customer_profiles (mirror of auth.users.email).
    const { data: profile } = await supabase
      .from("customer_profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profile?.id) {
      userId = profile.id;
      const { data: creds } = await supabase
        .from("passkeys" as never)
        .select("credential_id, transports")
        .eq("user_id", profile.id);
      allowCredentials = (
        (creds as { credential_id: string; transports: string[] | null }[] | null) ?? []
      ).map((c) => ({
        id: c.credential_id,
        transports: (c.transports ?? []) as AuthenticatorTransportFuture[],
      }));
    }
  }

  const options = await genAuthOptionsLib({
    rpID: getRpID(),
    userVerification: "preferred",
    allowCredentials,
  });

  await storeChallenge({
    userId,
    email: normalizedEmail,
    challenge: options.challenge,
    type: "authentication",
  });

  return options;
}

export async function verifyAuthentication(
  response: AuthenticationResponseJSON,
  email?: string | null,
): Promise<{ verified: boolean; actionLink: string; userId: string }> {
  const supabase = createServiceRoleClient();
  const credentialIdB64u = response.id;

  // Find the stored credential.
  const { data: cred } = await supabase
    .from("passkeys" as never)
    .select("id, user_id, credential_id, public_key, counter, transports")
    .eq("credential_id", credentialIdB64u)
    .maybeSingle();

  const credRow = cred as
    | {
        id: string;
        user_id: string;
        credential_id: string;
        public_key: unknown;
        counter: number;
        transports: string[] | null;
      }
    | null;
  if (!credRow) throw new Error("Unknown passkey credential.");

  // Resolve the challenge. Try (userId), then (email), then usernameless.
  const normalizedEmail = email?.trim().toLowerCase() ?? null;
  let expectedChallenge =
    (await consumeChallenge({ userId: credRow.user_id, type: "authentication" })) ??
    (normalizedEmail
      ? await consumeChallenge({ email: normalizedEmail, type: "authentication" })
      : null);
  if (!expectedChallenge) {
    expectedChallenge = await consumeChallenge({ type: "authentication" });
  }
  if (!expectedChallenge) {
    throw new Error("No valid authentication challenge found (may have expired).");
  }

  const publicKeyBytes = coercePublicKey(credRow.public_key);

  // simplewebauthn v11 accepts a `credential` object; v10 uses `authenticator`.
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getExpectedOrigin(),
    expectedRPID: getRpID(),
    requireUserVerification: false,
    // v11 shape
    credential: {
      id: credRow.credential_id,
      publicKey: publicKeyBytes,
      counter: Number(credRow.counter),
      transports: (credRow.transports ?? []) as AuthenticatorTransportFuture[],
    },
    // v10 shape (ignored by v11 if `credential` is present)
    authenticator: {
      credentialID: fromBase64Url(credRow.credential_id),
      credentialPublicKey: publicKeyBytes,
      counter: Number(credRow.counter),
      transports: (credRow.transports ?? []) as AuthenticatorTransportFuture[],
    },
  } as Parameters<typeof verifyAuthenticationResponse>[0]);

  if (!verification.verified) {
    throw new Error("Passkey authentication could not be verified.");
  }

  // Bump counter + last_used_at.
  const newCounter =
    (verification as unknown as { authenticationInfo?: { newCounter?: number } })
      .authenticationInfo?.newCounter ?? Number(credRow.counter) + 1;

  await supabase
    .from("passkeys" as never)
    .update({
      counter: newCounter,
      last_used_at: new Date().toISOString(),
    } as never)
    .eq("id", credRow.id);

  // Resolve this user's email so we can mint a magiclink.
  const { data: userRes } = await supabase.auth.admin.getUserById(credRow.user_id);
  const userEmail = userRes?.user?.email;
  if (!userEmail) {
    throw new Error("Could not resolve account email to complete sign-in.");
  }

  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: userEmail,
    options: {
      redirectTo: `${getExpectedOrigin()}/auth/callback`,
    },
  });
  if (linkErr || !linkData?.properties?.action_link) {
    throw new Error(linkErr?.message ?? "Failed to mint sign-in link.");
  }

  return {
    verified: true,
    actionLink: linkData.properties.action_link,
    userId: credRow.user_id,
  };
}
