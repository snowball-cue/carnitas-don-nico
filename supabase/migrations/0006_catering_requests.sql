-- =============================================================================
-- Carnitas Don Nico — Catering Requests (0006)
-- Public contact form for large-party orders (10+ lbs). Anyone can INSERT;
-- only admins can SELECT/UPDATE/DELETE.
-- =============================================================================

-- Extensions (safe if already enabled by 0001)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- -----------------------------------------------------------------------------
-- catering_requests
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catering_requests (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name                text NOT NULL,
  email                    citext NOT NULL,
  phone                    text NOT NULL,
  event_date               date NOT NULL,
  guest_count              integer NOT NULL CHECK (guest_count >= 10),
  estimated_lbs            numeric(6,2) NOT NULL CHECK (estimated_lbs >= 10),
  event_type               text,
  event_location           text,
  cuts_preference          text,
  includes_sides           boolean NOT NULL DEFAULT false,
  delivery_needed          boolean NOT NULL DEFAULT false,
  notes                    text,
  status                   text NOT NULL DEFAULT 'new'
                             CHECK (status IN ('new', 'contacted', 'quoted',
                                               'confirmed', 'completed', 'cancelled')),
  quoted_price             numeric(10,2),
  customer_id              uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  updated_by_admin_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_catering_requests_event_date
  ON public.catering_requests(event_date);
CREATE INDEX IF NOT EXISTS idx_catering_requests_status
  ON public.catering_requests(status);
CREATE INDEX IF NOT EXISTS idx_catering_requests_created_at
  ON public.catering_requests(created_at DESC);

-- Updated-at trigger (uses shared set_updated_at() from 0001)
DROP TRIGGER IF EXISTS trg_catering_requests_updated_at
  ON public.catering_requests;
CREATE TRIGGER trg_catering_requests_updated_at
BEFORE UPDATE ON public.catering_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row-Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE public.catering_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can insert a request — it's a public contact form.
DROP POLICY IF EXISTS "catering_public_insert" ON public.catering_requests;
CREATE POLICY "catering_public_insert" ON public.catering_requests
  FOR INSERT
  WITH CHECK (true);

-- Only admins/staff can read, update, or delete.
DROP POLICY IF EXISTS "catering_admin_select" ON public.catering_requests;
CREATE POLICY "catering_admin_select" ON public.catering_requests
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "catering_admin_update" ON public.catering_requests;
CREATE POLICY "catering_admin_update" ON public.catering_requests
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "catering_admin_delete" ON public.catering_requests;
CREATE POLICY "catering_admin_delete" ON public.catering_requests
  FOR DELETE USING (public.is_admin());

-- =============================================================================
-- End of 0006_catering_requests.sql
-- =============================================================================
