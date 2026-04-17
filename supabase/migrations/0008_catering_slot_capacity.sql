-- =============================================================================
-- Carnitas Don Nico — Catering capacity + distance (0008)
-- Each day has 2 catering slots (12:00, 16:00). Beyond that, requests come in
-- with event_time_slot=NULL meaning "please contact me to arrange custom time".
-- Also tracks driver distance (miles) for delivery fee calculation.
-- Delivery rule: first 10 miles free, $2/mi after.
-- =============================================================================

-- 1) Allow NULL in event_time_slot so "custom time" requests can insert without
--    picking one of the two fixed slots.
ALTER TABLE public.catering_requests
  ALTER COLUMN event_time_slot DROP NOT NULL;

-- Recreate the CHECK constraint to allow NULL explicitly
ALTER TABLE public.catering_requests
  DROP CONSTRAINT IF EXISTS catering_requests_event_time_slot_check;
ALTER TABLE public.catering_requests
  ADD CONSTRAINT catering_requests_event_time_slot_check
    CHECK (event_time_slot IS NULL OR event_time_slot IN ('12:00', '16:00'));

-- 2) Distance for delivery fee calc (customer's estimate, refined by admin on quote)
ALTER TABLE public.catering_requests
  ADD COLUMN IF NOT EXISTS delivery_miles numeric(6,2);

-- 3) Unique slot-per-day rule at the DB level — two rows cannot share the same
--    event_date + event_time_slot unless one is cancelled. Partial unique index
--    over non-null slots and non-cancelled rows.
DROP INDEX IF EXISTS uniq_catering_day_slot_active;
CREATE UNIQUE INDEX uniq_catering_day_slot_active
  ON public.catering_requests (event_date, event_time_slot)
  WHERE event_time_slot IS NOT NULL AND status <> 'cancelled';

-- =============================================================================
-- End of 0008_catering_slot_capacity.sql
-- =============================================================================
