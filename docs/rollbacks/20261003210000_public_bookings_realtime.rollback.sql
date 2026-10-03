-- ROLLBACK de 20261003210000_public_bookings_realtime
-- Remove só o que este PR adicionou. Não toca fila, lead-time (#121) nem reschedule (#120).

BEGIN;

DROP TRIGGER IF EXISTS public_bookings_broadcast_trg ON public.public_bookings;
DROP FUNCTION IF EXISTS public.public_bookings_broadcast();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'realtime' AND c.relname = 'messages'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Booking topics are readable" ON realtime.messages';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'public_bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.public_bookings;
  END IF;
END
$$;

COMMIT;
