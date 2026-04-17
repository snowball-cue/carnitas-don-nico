-- =============================================================================
-- Carnitas Don Nico — Broadcasts, Customer Groups & Unsubscribes
-- Adds mass-email broadcast system (admin) + manual customer grouping.
-- Depends on: 0001 (set_updated_at fn, is_admin fn, auth.users).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS citext;

-- -----------------------------------------------------------------------------
-- customer_groups — manual buckets ("Regulars", "Weddings", "Work lunches")
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_groups (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL UNIQUE,
  description  text,
  color        text DEFAULT 'oro',  -- nopal | oro | chile | jamaica | talavera | agave — used for badge color
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_groups_name ON public.customer_groups(name);

-- -----------------------------------------------------------------------------
-- customer_group_memberships — m2m between groups and (customer OR guest email)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_group_memberships (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id       uuid NOT NULL REFERENCES public.customer_groups(id) ON DELETE CASCADE,
  customer_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email          citext,   -- for guest entries
  added_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exactly_one_identity CHECK (
    (customer_id IS NOT NULL AND email IS NULL) OR
    (customer_id IS NULL AND email IS NOT NULL)
  ),
  -- Dedup: same user/email can't be in the same group twice
  UNIQUE NULLS NOT DISTINCT (group_id, customer_id, email)
);
CREATE INDEX IF NOT EXISTS idx_memberships_group    ON public.customer_group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_memberships_customer ON public.customer_group_memberships(customer_id);
CREATE INDEX IF NOT EXISTS idx_memberships_email    ON public.customer_group_memberships(email);

-- -----------------------------------------------------------------------------
-- unsubscribed_emails — keyed by email (authenticated + guest)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unsubscribed_emails (
  email           citext PRIMARY KEY,
  unsubscribed_at timestamptz NOT NULL DEFAULT now(),
  reason          text,
  source          text  -- "one_click", "admin", etc.
);

-- -----------------------------------------------------------------------------
-- broadcast_campaigns — an email broadcast
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.broadcast_campaigns (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject          text NOT NULL,
  body_html        text NOT NULL,
  body_text        text,
  locale           text NOT NULL DEFAULT 'es' CHECK (locale IN ('es', 'en')),
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','sending','sent','failed','cancelled')),
  total_recipients integer NOT NULL DEFAULT 0,
  delivered_count  integer NOT NULL DEFAULT 0,
  failed_count     integer NOT NULL DEFAULT 0,
  recipient_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  started_at       timestamptz,
  finished_at      timestamptz
);
CREATE INDEX IF NOT EXISTS idx_broadcasts_status     ON public.broadcast_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_at ON public.broadcast_campaigns(created_at DESC);

-- -----------------------------------------------------------------------------
-- broadcast_recipients — per-recipient tracking
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.broadcast_recipients (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    uuid NOT NULL REFERENCES public.broadcast_campaigns(id) ON DELETE CASCADE,
  email          citext NOT NULL,
  name           text,
  customer_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','sent','failed','skipped_unsubscribed','skipped_test_mode')),
  resend_id      text,
  error          text,
  sent_at        timestamptz,
  UNIQUE (campaign_id, email)
);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_campaign ON public.broadcast_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_status   ON public.broadcast_recipients(status);

-- -----------------------------------------------------------------------------
-- updated_at trigger for customer_groups
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_customer_groups_updated_at ON public.customer_groups;
CREATE TRIGGER trg_customer_groups_updated_at
BEFORE UPDATE ON public.customer_groups
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: admin-only for everything; unsubscribe allows public INSERT
-- -----------------------------------------------------------------------------
ALTER TABLE public.customer_groups              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_group_memberships   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unsubscribed_emails          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_campaigns          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_recipients         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "groups_admin_all"                ON public.customer_groups;
DROP POLICY IF EXISTS "memberships_admin_all"           ON public.customer_group_memberships;
DROP POLICY IF EXISTS "unsub_admin_all"                 ON public.unsubscribed_emails;
DROP POLICY IF EXISTS "broadcasts_admin_all"            ON public.broadcast_campaigns;
DROP POLICY IF EXISTS "broadcast_recipients_admin_all"  ON public.broadcast_recipients;

CREATE POLICY "groups_admin_all"
  ON public.customer_groups
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "memberships_admin_all"
  ON public.customer_group_memberships
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "unsub_admin_all"
  ON public.unsubscribed_emails
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "broadcasts_admin_all"
  ON public.broadcast_campaigns
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "broadcast_recipients_admin_all"
  ON public.broadcast_recipients
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Anyone can insert into unsubscribed_emails (one-click unsubscribe)
DROP POLICY IF EXISTS "unsub_public_insert" ON public.unsubscribed_emails;
CREATE POLICY "unsub_public_insert"
  ON public.unsubscribed_emails
  FOR INSERT WITH CHECK (true);
