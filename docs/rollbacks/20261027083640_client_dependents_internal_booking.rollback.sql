BEGIN;
DROP FUNCTION IF EXISTS public.create_internal_attendee_bookings(uuid, uuid, uuid, timestamptz, jsonb, text);
DROP TRIGGER IF EXISTS appointments_snapshot_attendee ON public.appointments;
DROP FUNCTION IF EXISTS public.snapshot_internal_attendee();
DROP INDEX IF EXISTS public.appointments_dependent_id_idx;
ALTER TABLE public.appointments DROP COLUMN IF EXISTS dependent_id, DROP COLUMN IF EXISTS attendee_name;
DROP TABLE IF EXISTS public.client_dependents;
DROP INDEX IF EXISTS public.clients_tenant_id_dependent_fk;
COMMIT;
