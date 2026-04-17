-- =============================================================================
-- Carnitas Don Nico — Passkeys (WebAuthn) schema
-- Run this in the Supabase SQL Editor after 0001_initial_schema.sql.
-- =============================================================================

-- Store WebAuthn credentials per user
CREATE TABLE IF NOT EXISTS public.passkeys (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id             text NOT NULL UNIQUE,          -- base64url
  public_key                bytea NOT NULL,                -- COSE-encoded pubkey
  counter                   bigint NOT NULL DEFAULT 0,
  transports                text[] NOT NULL DEFAULT '{}',
  device_type               text,                          -- singleDevice | multiDevice
  backed_up                 boolean NOT NULL DEFAULT false,
  nickname                  text,                          -- user's label: "iPhone", "MacBook"
  last_used_at              timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_passkeys_user_id ON public.passkeys(user_id);

-- Challenge storage (short-lived; could be Redis, but for simplicity pg table)
CREATE TABLE IF NOT EXISTS public.passkey_challenges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email       citext,                                        -- for sign-in-by-email flow
  challenge   text NOT NULL,
  type        text NOT NULL CHECK (type IN ('registration','authentication')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '5 minutes'
);
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_expiry ON public.passkey_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_user   ON public.passkey_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_email  ON public.passkey_challenges(email);

ALTER TABLE public.passkeys             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passkey_challenges   ENABLE ROW LEVEL SECURITY;

-- Only service role writes challenges; users can read their own passkeys only.
DROP POLICY IF EXISTS "passkeys_own_select" ON public.passkeys;
DROP POLICY IF EXISTS "passkeys_own_delete" ON public.passkeys;
DROP POLICY IF EXISTS "passkeys_own_update" ON public.passkeys;
CREATE POLICY "passkeys_own_select" ON public.passkeys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "passkeys_own_delete" ON public.passkeys FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "passkeys_own_update" ON public.passkeys FOR UPDATE USING (auth.uid() = user_id);

-- Challenges table: no policies — only service role should ever touch it.
-- RLS is enabled so anon/authenticated have no access by default.

-- =============================================================================
-- End of 0002_passkeys.sql
-- =============================================================================
