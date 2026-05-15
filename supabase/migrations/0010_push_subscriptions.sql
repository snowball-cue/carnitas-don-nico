-- =============================================================================
-- Carnitas Don Nico — Web Push Subscriptions + catering_request notification
-- Stores per-device Web Push endpoints so the owner gets a phone notification
-- when a customer places/cancels an order or submits a catering request.
-- Depends on: 0001 (auth.users, is_admin fn, notification_type enum).
-- =============================================================================

-- Extend the notification_type enum with a catering_request variant so the
-- owner's inbox can differentiate catering submissions from other events.
DO $$
BEGIN
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'catering_request';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint      text NOT NULL,
  p256dh        text NOT NULL,
  auth          text NOT NULL,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  -- One row per (user, device) — endpoint is the device-unique identifier.
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions(user_id);

-- -----------------------------------------------------------------------------
-- RLS — owners can manage their own subscriptions; service role does sends.
-- -----------------------------------------------------------------------------
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- A user can read their own subscriptions (so the admin UI can show "this
-- device is subscribed").
CREATE POLICY "push_subscriptions_owner_select"
  ON public.push_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- A user can register/refresh their own subscription.
CREATE POLICY "push_subscriptions_owner_insert"
  ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_owner_update"
  ON public.push_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- A user can remove their own subscription (e.g. on sign-out / settings).
CREATE POLICY "push_subscriptions_owner_delete"
  ON public.push_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypasses RLS (used by the push dispatcher to read every
-- admin/staff subscription and to prune expired endpoints).
