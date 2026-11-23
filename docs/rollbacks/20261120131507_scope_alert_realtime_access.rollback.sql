BEGIN;

GRANT SELECT ON TABLE public.public_bookings TO anon;
DROP TRIGGER IF EXISTS broadcast_notification_change ON public.notifications;
DROP FUNCTION IF EXISTS public.broadcast_notification_change();
DROP POLICY IF EXISTS agendix_alert_topics_server_send_only ON realtime.messages;
DROP POLICY IF EXISTS agendix_alert_topics_receive ON realtime.messages;
DROP POLICY IF EXISTS agendix_alert_topics_recipient_only ON realtime.messages;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;

COMMIT;
