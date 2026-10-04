-- ROLLBACK de 20261004072408_public_booking_completed_noshow
-- Idempotente. Não toca #120 (reschedule), #121 (lead time) nem #122 (broadcast).
-- no_show volta para confirmed antes de restaurar a constraint antiga.
--
-- ANTES de aplicar: reverter o frontend (Minha Área chama get_client_bookings_history_v2;
-- esta rotina dá DROP nessa RPC). Sem o revert, a área do cliente quebra.

BEGIN;

DROP TRIGGER IF EXISTS sync_public_booking_on_appointment_outcome ON public.appointments;
DROP FUNCTION IF EXISTS public.sync_public_booking_on_appointment_outcome();
DROP FUNCTION IF EXISTS public.get_client_bookings_history_v2(text, uuid);
DROP FUNCTION IF EXISTS public.derive_client_booking_status(text, uuid, text, timestamptz, uuid, text);

UPDATE public.public_bookings
   SET status = 'confirmed',
       updated_at = NOW()
 WHERE status = 'no_show';

ALTER TABLE public.public_bookings DROP CONSTRAINT IF EXISTS public_bookings_status_check;
ALTER TABLE public.public_bookings
  ADD CONSTRAINT public_bookings_status_check
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'confirmed'::text,
    'cancelled'::text,
    'completed'::text
  ]));

COMMIT;
