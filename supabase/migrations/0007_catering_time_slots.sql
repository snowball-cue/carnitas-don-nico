-- =============================================================================
-- Carnitas Don Nico — Catering time slots (0007)
-- Customers can only pick one of 2 pickup/delivery windows: noon or 4pm.
-- =============================================================================

ALTER TABLE public.catering_requests
  ADD COLUMN IF NOT EXISTS event_time_slot text
    CHECK (event_time_slot IN ('12:00', '16:00'));

-- Backfill any legacy rows to noon so the NOT NULL we're about to add holds.
UPDATE public.catering_requests
   SET event_time_slot = '12:00'
 WHERE event_time_slot IS NULL;

ALTER TABLE public.catering_requests
  ALTER COLUMN event_time_slot SET NOT NULL;

-- =============================================================================
-- End of 0007_catering_time_slots.sql
-- =============================================================================
