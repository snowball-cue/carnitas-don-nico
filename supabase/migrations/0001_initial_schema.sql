-- =============================================================================
-- Carnitas Don Nico — Initial Schema
-- Postgres 15 / Supabase
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- -----------------------------------------------------------------------------
-- Enums (wrapped in DO blocks since CREATE TYPE has no IF NOT EXISTS)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('customer', 'staff', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE menu_category AS ENUM ('carnitas', 'chicharron', 'drinks', 'sides', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'ready', 'picked_up', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('unpaid', 'deposit_paid', 'paid', 'refunded', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('stripe', 'cash', 'zelle', 'venmo', 'cashapp', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE expense_category AS ENUM (
    'carne', 'heb', 'sams', 'restaurant_depot', 'misc',
    'cilantro_lime', 'tortilla', 'gas', 'packaging', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'new_order', 'deposit_paid', 'cancellation', 'capacity_full',
    'low_stock', 'pickup_reminder', 'review_received'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE receipt_status AS ENUM ('pending_review', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE menu_unit AS ENUM ('lb', 'each');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- Shared trigger: updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- customer_profiles (extends auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id                    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             text,
  phone                 text,
  email                 citext,
  total_lbs_purchased   numeric(10,2) NOT NULL DEFAULT 0,
  loyalty_points        integer NOT NULL DEFAULT 0,
  referral_code         text UNIQUE NOT NULL,
  referred_by           uuid REFERENCES public.customer_profiles(id) ON DELETE SET NULL,
  marketing_opt_in      boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_referral_code ON public.customer_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_referred_by   ON public.customer_profiles(referred_by);
DROP TRIGGER IF EXISTS trg_customer_profiles_updated_at ON public.customer_profiles;
CREATE TRIGGER trg_customer_profiles_updated_at
BEFORE UPDATE ON public.customer_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- app_roles (separate table — cleaner than a role column for multi-role + audit)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_roles (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       app_role NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, role)
);
CREATE INDEX IF NOT EXISTS idx_app_roles_user_id ON public.app_roles(user_id);

-- Helper: is the calling user an admin/staff?
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_roles
    WHERE user_id = uid AND role IN ('admin', 'staff')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_roles
    WHERE user_id = uid AND role = 'admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- handle_new_user trigger (auto-create customer_profile + referral code)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  code text;
  tries int := 0;
BEGIN
  LOOP
    code := 'NICO-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.customer_profiles WHERE referral_code = code);
    tries := tries + 1;
    IF tries > 10 THEN RAISE EXCEPTION 'Could not generate unique referral code'; END IF;
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customer_profiles (id, full_name, email, phone, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.email,
    NEW.phone,
    public.generate_referral_code()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.app_roles (user_id, role) VALUES (NEW.id, 'customer')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- menu_items (Carnitas stored as ONE item + variants table — cleaner UX:
--   lets customer mix 1 lb across Maciza/Surtido with one price row; scales
--   for future "combo" pricing w/o duplicating rows)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           text UNIQUE NOT NULL,
  name_en        text NOT NULL,
  name_es        text NOT NULL,
  description_en text,
  description_es text,
  category       menu_category NOT NULL,
  unit           menu_unit NOT NULL,
  price          numeric(10,2) NOT NULL CHECK (price >= 0),
  min_quantity   numeric(10,2) NOT NULL DEFAULT 1,
  quantity_step  numeric(10,2) NOT NULL DEFAULT 1,
  image_url      text,
  in_stock       boolean NOT NULL DEFAULT true,
  has_variants   boolean NOT NULL DEFAULT false,
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_menu_items_category    ON public.menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_in_stock    ON public.menu_items(in_stock);
CREATE INDEX IF NOT EXISTS idx_menu_items_sort_order  ON public.menu_items(sort_order);
DROP TRIGGER IF EXISTS trg_menu_items_updated_at ON public.menu_items;
CREATE TRIGGER trg_menu_items_updated_at
BEFORE UPDATE ON public.menu_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- menu_item_variants (Maciza / Surtido / Solo Maciza / Poquito Cuerito)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_item_variants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id    uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  slug            text NOT NULL,
  name_en         text NOT NULL,
  name_es         text NOT NULL,
  description_en  text,
  description_es  text,
  price_delta     numeric(10,2) NOT NULL DEFAULT 0,
  in_stock        boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (menu_item_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_menu_item_variants_item ON public.menu_item_variants(menu_item_id);
DROP TRIGGER IF EXISTS trg_menu_item_variants_updated_at ON public.menu_item_variants;
CREATE TRIGGER trg_menu_item_variants_updated_at
BEFORE UPDATE ON public.menu_item_variants
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- pickup_dates (owner-controlled pickup calendar)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pickup_dates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_date         date NOT NULL UNIQUE,
  pickup_window_start time NOT NULL DEFAULT '11:00',
  pickup_window_end   time NOT NULL DEFAULT '14:00',
  capacity_lbs        numeric(10,2) NOT NULL CHECK (capacity_lbs >= 0),
  reserved_lbs        numeric(10,2) NOT NULL DEFAULT 0 CHECK (reserved_lbs >= 0),
  cutoff_at           timestamptz NOT NULL,
  is_open             boolean NOT NULL DEFAULT true,
  notes_en            text,
  notes_es            text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pickup_dates_date    ON public.pickup_dates(pickup_date);
CREATE INDEX IF NOT EXISTS idx_pickup_dates_is_open ON public.pickup_dates(is_open);
DROP TRIGGER IF EXISTS trg_pickup_dates_updated_at ON public.pickup_dates;
CREATE TRIGGER trg_pickup_dates_updated_at
BEFORE UPDATE ON public.pickup_dates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Order numbering — sequence + DN-#### formatter
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'DN-' || lpad(nextval('public.order_number_seq')::text, 4, '0');
$$;

-- -----------------------------------------------------------------------------
-- orders
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number              text UNIQUE NOT NULL DEFAULT public.generate_order_number(),
  customer_id               uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name                text,
  guest_phone               text,
  guest_email               citext,
  pickup_date_id            uuid NOT NULL REFERENCES public.pickup_dates(id) ON DELETE RESTRICT,
  pickup_date               date NOT NULL,
  subtotal                  numeric(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax                       numeric(10,2) NOT NULL DEFAULT 0,
  tip                       numeric(10,2) NOT NULL DEFAULT 0,
  discount                  numeric(10,2) NOT NULL DEFAULT 0,
  total                     numeric(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  deposit_paid              numeric(10,2) NOT NULL DEFAULT 0 CHECK (deposit_paid >= 0),
  balance_remaining         numeric(10,2) NOT NULL DEFAULT 0,
  total_lbs                 numeric(10,2) NOT NULL DEFAULT 0,
  status                    order_status NOT NULL DEFAULT 'pending',
  payment_method            payment_method,
  payment_status            payment_status NOT NULL DEFAULT 'unpaid',
  stripe_payment_intent_id  text UNIQUE,
  notes                     text,
  cancelled_at              timestamptz,
  confirmed_at              timestamptz,
  picked_up_at              timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  -- One of customer_id OR guest fields must be populated
  CONSTRAINT chk_customer_or_guest CHECK (
    customer_id IS NOT NULL
    OR (guest_name IS NOT NULL AND guest_phone IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id     ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_pickup_date_id  ON public.orders(pickup_date_id);
CREATE INDEX IF NOT EXISTS idx_orders_pickup_date     ON public.orders(pickup_date);
CREATE INDEX IF NOT EXISTS idx_orders_status          ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at      ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_pi       ON public.orders(stripe_payment_intent_id);
DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- order_items
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id        uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  variant_id          uuid REFERENCES public.menu_item_variants(id) ON DELETE SET NULL,
  name_snapshot_en    text NOT NULL,
  name_snapshot_es    text,
  variant_snapshot    text,
  quantity            numeric(10,2) NOT NULL CHECK (quantity > 0),
  unit                menu_unit NOT NULL,
  unit_price_snapshot numeric(10,2) NOT NULL CHECK (unit_price_snapshot >= 0),
  line_total          numeric(10,2) NOT NULL CHECK (line_total >= 0),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id     ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON public.order_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id   ON public.order_items(variant_id);

-- -----------------------------------------------------------------------------
-- Capacity adjustment trigger: ±reserved_lbs on status transitions
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.adjust_pickup_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  active_before boolean := FALSE;  -- did it count against capacity before?
  active_after  boolean := FALSE;  -- does it count against capacity now?
BEGIN
  IF TG_OP = 'UPDATE' THEN
    active_before := OLD.status IN ('confirmed', 'ready', 'picked_up');
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    active_after := NEW.status IN ('confirmed', 'ready', 'picked_up');
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('confirmed', 'ready', 'picked_up') AND OLD.total_lbs > 0 THEN
      UPDATE public.pickup_dates
         SET reserved_lbs = GREATEST(0, reserved_lbs - OLD.total_lbs)
       WHERE id = OLD.pickup_date_id;
    END IF;
    RETURN OLD;
  END IF;

  -- Release old reservation if the row was active before
  IF active_before AND OLD.total_lbs > 0 THEN
    UPDATE public.pickup_dates
       SET reserved_lbs = GREATEST(0, reserved_lbs - OLD.total_lbs)
     WHERE id = OLD.pickup_date_id;
  END IF;

  -- Add new reservation if the row is active now
  IF active_after AND NEW.total_lbs > 0 THEN
    UPDATE public.pickup_dates
       SET reserved_lbs = reserved_lbs + NEW.total_lbs
     WHERE id = NEW.pickup_date_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_capacity ON public.orders;
CREATE TRIGGER trg_orders_capacity
AFTER INSERT OR UPDATE OF status, total_lbs, pickup_date_id OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.adjust_pickup_capacity();

-- -----------------------------------------------------------------------------
-- expenses (P&L)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date       date NOT NULL,
  event_date         date,  -- which cook-event (nullable)
  category           expense_category NOT NULL DEFAULT 'other',
  description        text,
  quantity           numeric(10,2),
  unit_cost          numeric(10,2),
  amount             numeric(10,2) NOT NULL,  -- negative for expense
  receipt_image_url  text,
  receipt_id         uuid,  -- FK added after receipts table below
  created_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_event_date   ON public.expenses(event_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category     ON public.expenses(category);
DROP TRIGGER IF EXISTS trg_expenses_updated_at ON public.expenses;
CREATE TRIGGER trg_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- manual_revenue (walk-ups / cash sales not in ordering system)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manual_revenue (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date   date NOT NULL,
  amount       numeric(10,2) NOT NULL CHECK (amount >= 0),
  lbs_sold     numeric(10,2),
  description  text,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_manual_revenue_event_date ON public.manual_revenue(event_date);
DROP TRIGGER IF EXISTS trg_manual_revenue_updated_at ON public.manual_revenue;
CREATE TRIGGER trg_manual_revenue_updated_at
BEFORE UPDATE ON public.manual_revenue
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- shopping_list
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shopping_list (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name_en    text NOT NULL,
  item_name_es    text,
  quantity        numeric(10,2),
  unit            text,
  estimated_cost  numeric(10,2),
  notes           text,
  needed_by_date  date,
  is_purchased    boolean NOT NULL DEFAULT false,
  purchased_at    timestamptz,
  purchased_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shopping_list_is_purchased   ON public.shopping_list(is_purchased);
CREATE INDEX IF NOT EXISTS idx_shopping_list_needed_by_date ON public.shopping_list(needed_by_date);
DROP TRIGGER IF EXISTS trg_shopping_list_updated_at ON public.shopping_list;
CREATE TRIGGER trg_shopping_list_updated_at
BEFORE UPDATE ON public.shopping_list
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- investments (equipment)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.investments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name       text NOT NULL,
  cost            numeric(10,2) NOT NULL CHECK (cost >= 0),
  purchase_date   date NOT NULL,
  category        text,
  notes           text,
  receipt_id      uuid,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_investments_purchase_date ON public.investments(purchase_date);
DROP TRIGGER IF EXISTS trg_investments_updated_at ON public.investments;
CREATE TRIGGER trg_investments_updated_at
BEFORE UPDATE ON public.investments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- receipts (AI-parsed uploads)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receipts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path       text NOT NULL,
  uploaded_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  parsed_json        jsonb,
  parsed_total       numeric(10,2),
  store_name         text,
  purchase_date      date,
  status             receipt_status NOT NULL DEFAULT 'pending_review',
  linked_expense_ids uuid[] NOT NULL DEFAULT '{}',
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_receipts_status      ON public.receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_uploaded_by ON public.receipts(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_receipts_purchase_date ON public.receipts(purchase_date);
DROP TRIGGER IF EXISTS trg_receipts_updated_at ON public.receipts;
CREATE TRIGGER trg_receipts_updated_at
BEFORE UPDATE ON public.receipts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Now wire the deferred FKs to receipts
ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS fk_expenses_receipt_id,
  ADD  CONSTRAINT fk_expenses_receipt_id
       FOREIGN KEY (receipt_id) REFERENCES public.receipts(id) ON DELETE SET NULL;
ALTER TABLE public.investments
  DROP CONSTRAINT IF EXISTS fk_investments_receipt_id,
  ADD  CONSTRAINT fk_investments_receipt_id
       FOREIGN KEY (receipt_id) REFERENCES public.receipts(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type              notification_type NOT NULL,
  title             text NOT NULL,
  body              text,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread    ON public.notifications(recipient_user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- -----------------------------------------------------------------------------
-- push_subscriptions (Web Push API)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text NOT NULL UNIQUE,
  keys        jsonb NOT NULL,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_seen   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- -----------------------------------------------------------------------------
-- reviews
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rating     integer CHECK (rating BETWEEN 1 AND 5),
  comment    text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id    ON public.reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON public.reviews(customer_id);
DROP TRIGGER IF EXISTS trg_reviews_updated_at ON public.reviews;
CREATE TRIGGER trg_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- Row-Level Security
-- =============================================================================

ALTER TABLE public.customer_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_variants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_dates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_revenue       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews              ENABLE ROW LEVEL SECURITY;

-- ---- customer_profiles ----
DROP POLICY IF EXISTS "own_profile_select"  ON public.customer_profiles;
DROP POLICY IF EXISTS "own_profile_update"  ON public.customer_profiles;
DROP POLICY IF EXISTS "admin_profile_all"   ON public.customer_profiles;
CREATE POLICY "own_profile_select" ON public.customer_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own_profile_update" ON public.customer_profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "admin_profile_all" ON public.customer_profiles
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---- app_roles ----
DROP POLICY IF EXISTS "own_role_select"  ON public.app_roles;
DROP POLICY IF EXISTS "admin_role_all"   ON public.app_roles;
CREATE POLICY "own_role_select" ON public.app_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admin_role_all" ON public.app_roles
  FOR ALL USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

-- ---- menu_items / variants (public read of in-stock, admin write) ----
DROP POLICY IF EXISTS "menu_public_select"      ON public.menu_items;
DROP POLICY IF EXISTS "menu_admin_all"          ON public.menu_items;
DROP POLICY IF EXISTS "variant_public_select"   ON public.menu_item_variants;
DROP POLICY IF EXISTS "variant_admin_all"       ON public.menu_item_variants;
CREATE POLICY "menu_public_select" ON public.menu_items
  FOR SELECT USING (true);
CREATE POLICY "menu_admin_all" ON public.menu_items
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "variant_public_select" ON public.menu_item_variants
  FOR SELECT USING (true);
CREATE POLICY "variant_admin_all" ON public.menu_item_variants
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---- pickup_dates (public can see open/active; admin writes) ----
DROP POLICY IF EXISTS "pickup_public_select_open" ON public.pickup_dates;
DROP POLICY IF EXISTS "pickup_admin_all"          ON public.pickup_dates;
CREATE POLICY "pickup_public_select_open" ON public.pickup_dates
  FOR SELECT USING (is_open = true OR public.is_admin());
CREATE POLICY "pickup_admin_all" ON public.pickup_dates
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---- orders ----
-- Authenticated customers: SELECT/INSERT their own; admins full access.
-- Guest INSERTs go through an edge function using the service role key
-- (SAFER than permissive anon RLS + captcha — no rate-limit tie-in needed).
DROP POLICY IF EXISTS "orders_own_select"  ON public.orders;
DROP POLICY IF EXISTS "orders_own_insert"  ON public.orders;
DROP POLICY IF EXISTS "orders_own_update"  ON public.orders;
DROP POLICY IF EXISTS "orders_admin_all"   ON public.orders;
CREATE POLICY "orders_own_select" ON public.orders
  FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "orders_own_insert" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "orders_own_update" ON public.orders
  FOR UPDATE USING (auth.uid() = customer_id AND status IN ('pending'));
CREATE POLICY "orders_admin_all" ON public.orders
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---- order_items ----
DROP POLICY IF EXISTS "order_items_own_select" ON public.order_items;
DROP POLICY IF EXISTS "order_items_own_insert" ON public.order_items;
DROP POLICY IF EXISTS "order_items_admin_all"  ON public.order_items;
CREATE POLICY "order_items_own_select" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o
             WHERE o.id = order_items.order_id AND o.customer_id = auth.uid())
  );
CREATE POLICY "order_items_own_insert" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o
             WHERE o.id = order_items.order_id AND o.customer_id = auth.uid())
  );
CREATE POLICY "order_items_admin_all" ON public.order_items
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---- admin-only tables: expenses, manual_revenue, shopping_list, investments, receipts ----
DROP POLICY IF EXISTS "expenses_admin_all"       ON public.expenses;
DROP POLICY IF EXISTS "manual_revenue_admin_all" ON public.manual_revenue;
DROP POLICY IF EXISTS "shopping_admin_all"       ON public.shopping_list;
DROP POLICY IF EXISTS "investments_admin_all"    ON public.investments;
DROP POLICY IF EXISTS "receipts_admin_all"       ON public.receipts;
CREATE POLICY "expenses_admin_all"       ON public.expenses       FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "manual_revenue_admin_all" ON public.manual_revenue FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "shopping_admin_all"       ON public.shopping_list  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "investments_admin_all"    ON public.investments    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "receipts_admin_all"       ON public.receipts       FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---- notifications ----
DROP POLICY IF EXISTS "notif_own_select" ON public.notifications;
DROP POLICY IF EXISTS "notif_own_update" ON public.notifications;
DROP POLICY IF EXISTS "notif_admin_all"  ON public.notifications;
CREATE POLICY "notif_own_select" ON public.notifications
  FOR SELECT USING (auth.uid() = recipient_user_id);
CREATE POLICY "notif_own_update" ON public.notifications
  FOR UPDATE USING (auth.uid() = recipient_user_id);
CREATE POLICY "notif_admin_all" ON public.notifications
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---- push_subscriptions ----
DROP POLICY IF EXISTS "push_own_all"   ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_admin_all" ON public.push_subscriptions;
CREATE POLICY "push_own_all" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_admin_all" ON public.push_subscriptions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---- reviews ----
DROP POLICY IF EXISTS "reviews_public_select" ON public.reviews;
DROP POLICY IF EXISTS "reviews_own_insert"    ON public.reviews;
DROP POLICY IF EXISTS "reviews_own_update"    ON public.reviews;
DROP POLICY IF EXISTS "reviews_admin_all"     ON public.reviews;
CREATE POLICY "reviews_public_select" ON public.reviews
  FOR SELECT USING (true);
CREATE POLICY "reviews_own_insert" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "reviews_own_update" ON public.reviews
  FOR UPDATE USING (auth.uid() = customer_id);
CREATE POLICY "reviews_admin_all" ON public.reviews
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =============================================================================
-- Seed data — menu
-- =============================================================================

-- Carnitas: ONE item with variants table (mix-and-match lbs in a single line)
INSERT INTO public.menu_items
  (slug, name_en, name_es, description_en, description_es, category, unit, price, min_quantity, quantity_step, has_variants, sort_order)
VALUES
  ('carnitas',
   'Carnitas',
   'Carnitas',
   'Slow-cooked pork, sold by the pound. Choose your cut below.',
   'Cerdo cocido a fuego lento, vendido por libra. Elige tu corte.',
   'carnitas', 'lb', 20.00, 0.5, 0.5, true, 10),
  ('chicharron',
   'Chicharrón',
   'Chicharrón',
   'Crispy fried pork belly, sold by the pound.',
   'Panceta de cerdo frita y crujiente, vendida por libra.',
   'chicharron', 'lb', 30.00, 0.5, 0.5, false, 20),
  ('horchata',       'Horchata',          'Horchata',          'Sweet rice & cinnamon agua fresca.', 'Agua fresca de arroz y canela.',   'drinks', 'each', 4.00, 1, 1, false, 30),
  ('jamaica',        'Jamaica',           'Jamaica',           'Hibiscus iced tea.',                'Té helado de flor de jamaica.',    'drinks', 'each', 4.00, 1, 1, false, 31),
  ('tamarindo',      'Tamarindo',         'Tamarindo',         'Tamarind agua fresca.',             'Agua fresca de tamarindo.',        'drinks', 'each', 4.00, 1, 1, false, 32),
  ('jarritos-mandarina',   'Jarritos Mandarina',   'Jarritos Mandarina',   'Mexican mandarin soda.', 'Refresco mexicano de mandarina.', 'drinks', 'each', 4.00, 1, 1, false, 33),
  ('jarritos-lima-limon',  'Jarritos Lima-Limón',  'Jarritos Lima-Limón',  'Mexican lime soda.',     'Refresco mexicano de lima-limón.', 'drinks', 'each', 4.00, 1, 1, false, 34),
  ('jarritos-tamarindo',   'Jarritos Tamarindo',   'Jarritos Tamarindo',   'Mexican tamarind soda.', 'Refresco mexicano de tamarindo.', 'drinks', 'each', 4.00, 1, 1, false, 35),
  ('agua-fresca-del-dia',  'Agua Fresca del Día',  'Agua Fresca del Día',  'Ask about today''s flavor.', 'Pregunta por el sabor del día.', 'drinks', 'each', 4.00, 1, 1, false, 36)
ON CONFLICT (slug) DO NOTHING;

-- Carnitas variants
WITH c AS (SELECT id FROM public.menu_items WHERE slug = 'carnitas')
INSERT INTO public.menu_item_variants
  (menu_item_id, slug, name_en, name_es, description_en, description_es, price_delta, sort_order)
SELECT c.id, v.slug, v.name_en, v.name_es, v.desc_en, v.desc_es, 0, v.sort
FROM c, (VALUES
  ('maciza',          'Maciza',          'Maciza',          'Lean shoulder cut.',                       'Corte magro de espaldilla.',                      1),
  ('surtido',         'Surtido',         'Surtido',         'Mixed cuts with some fat — full flavor.',  'Corte surtido con grasa — máximo sabor.',         2),
  ('solo-maciza',     'Solo Maciza',     'Solo Maciza',     'Only lean maciza, no fat.',                'Sólo maciza, sin grasa.',                         3),
  ('poquito-cuerito', 'Poquito Cuerito', 'Poquito Cuerito', 'A little crispy skin mixed in.',           'Un poquito de cuerito (piel crujiente) mezclado.',4)
) AS v(slug, name_en, name_es, desc_en, desc_es, sort)
ON CONFLICT (menu_item_id, slug) DO NOTHING;

-- =============================================================================
-- End of 0001_initial_schema.sql
-- =============================================================================
