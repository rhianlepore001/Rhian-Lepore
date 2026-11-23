BEGIN;

DO $$
BEGIN
  IF has_table_privilege('anon', 'public.public_bookings', 'SELECT')
    OR NOT has_table_privilege('authenticated', 'public.public_bookings', 'SELECT')
    OR EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
    RAISE EXCEPTION 'Direct Realtime relations are not scoped';
  END IF;
END;
$$;

INSERT INTO public.notifications VALUES ('10000000-0000-4000-8000-000000000001', 'Synthetic private message');
UPDATE public.notifications SET message = 'Synthetic update';
DO $$
BEGIN
  IF (SELECT count(*) FROM realtime.messages) <> 2
    OR EXISTS (
      SELECT 1 FROM realtime.messages WHERE topic <> 'alerts:10000000-0000-4000-8000-000000000001'
        OR event <> 'changed' OR payload <> '{}'::jsonb OR private IS NOT TRUE
    ) THEN
    RAISE EXCEPTION 'Alerts must publish private invalidations without notification data';
  END IF;
END;
$$;

SET LOCAL realtime.topic = 'alerts:10000000-0000-4000-8000-000000000001';
SET LOCAL ROLE anon;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM realtime.messages) THEN
    RAISE EXCEPTION 'Anonymous alert read is allowed';
  END IF;
END;
$$;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM realtime.messages) THEN
    RAISE EXCEPTION 'Alert access crossed the recipient boundary';
  END IF;
END;
$$;

SET LOCAL request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
DO $$
BEGIN
  IF (SELECT count(*) FROM realtime.messages) <> 2 THEN
    RAISE EXCEPTION 'Recipient cannot receive private notification events';
  END IF;
  BEGIN
    INSERT INTO realtime.messages (extension) VALUES ('broadcast');
    RAISE EXCEPTION 'Alert insert must require server privileges';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

ROLLBACK;
