-- =============================================================================
-- ROLLBACK de 20261003160000_public_booking_lead_time
-- =============================================================================
-- Remove só o que este PR adicionou. O front volta a chamar get_available_slots.
-- A coluna profiles.booking_lead_time_hours permanece (já existia antes).
-- md5 de create_secure_booking, create_public_booking, get_available_slots e
-- enforce_agenda_block_on_appointments não muda (nunca foram reescritas).
-- =============================================================================

BEGIN;

DROP TRIGGER IF EXISTS enforce_lead_time_on_public_bookings ON public.public_bookings;
DROP FUNCTION IF EXISTS public.enforce_lead_time_on_public_bookings();
DROP FUNCTION IF EXISTS public.get_full_dates_v2(uuid, date, date, uuid, integer);
DROP FUNCTION IF EXISTS public.get_available_slots_v2(uuid, date, uuid, integer, boolean);
DROP FUNCTION IF EXISTS public.public_booking_lead_time_hours(text);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS booking_lead_time_hours_range;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_settings'
      AND column_name = 'lead_time_hours'
  ) THEN
    EXECUTE 'COMMENT ON COLUMN public.business_settings.lead_time_hours IS NULL';
  END IF;
END $$;

COMMIT;
