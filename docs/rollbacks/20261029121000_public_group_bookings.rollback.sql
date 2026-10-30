BEGIN;
DROP TRIGGER IF EXISTS appointments_a_resolve_online_attendee ON public.appointments;
DROP FUNCTION IF EXISTS public.resolve_online_group_attendee();
DROP FUNCTION IF EXISTS public.create_public_group_booking(text, text, text, timestamptz, jsonb);
DROP FUNCTION IF EXISTS public.public_group_slot_within_hours(text, timestamptz, integer);
DROP INDEX IF EXISTS public.public_bookings_group_id_idx;
ALTER TABLE public.public_bookings DROP CONSTRAINT IF EXISTS public_bookings_attendee_name_check;
ALTER TABLE public.public_bookings DROP CONSTRAINT IF EXISTS public_bookings_group_consistency;
ALTER TABLE public.public_bookings
  DROP COLUMN IF EXISTS attendee_name,
  DROP COLUMN IF EXISTS group_position,
  DROP COLUMN IF EXISTS group_id;
COMMIT;
