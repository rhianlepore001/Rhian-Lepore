BEGIN;
DROP FUNCTION IF EXISTS public.create_internal_attendee_bookings_v2(uuid, uuid, uuid, timestamptz, jsonb, text);
COMMIT;
