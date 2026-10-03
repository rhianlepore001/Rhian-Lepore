-- Migration: broadcast realtime de public_bookings (cliente anon) + publication (dono)
-- Data: 2026-10-03
-- Contexto: postgres_changes em public_bookings nunca chega ao cliente anon (RLS).
-- Trigger publica broadcast no tópico `booking:<id>` com payload mínimo
-- (id, status, appointment_time, op, at). Dono/staff passam a receber
-- postgres_changes via publication, filtrado por business_id no cliente.

CREATE OR REPLACE FUNCTION public.public_bookings_broadcast()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.appointment_time IS NOT DISTINCT FROM OLD.appointment_time THEN
    RETURN NULL;
  END IF;

  BEGIN
    PERFORM realtime.send(
      jsonb_build_object(
        'id', NEW.id,
        'status', NEW.status,
        'appointment_time', NEW.appointment_time,
        'op', TG_OP,
        'at', now()
      ),
      'booking_status',
      'booking:' || NEW.id::text,
      true
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'public_bookings_broadcast: %', SQLERRM;
  END;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS public_bookings_broadcast_trg ON public.public_bookings;
CREATE TRIGGER public_bookings_broadcast_trg
AFTER INSERT OR UPDATE OF status, appointment_time ON public.public_bookings
FOR EACH ROW EXECUTE FUNCTION public.public_bookings_broadcast();

DROP POLICY IF EXISTS "Booking topics are readable" ON realtime.messages;
CREATE POLICY "Booking topics are readable"
ON realtime.messages
FOR SELECT
TO anon, authenticated
USING (realtime.topic() LIKE 'booking:%' AND realtime.messages.extension = 'broadcast');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'public_bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.public_bookings;
  END IF;
END
$$;
