BEGIN;

REVOKE SELECT ON TABLE public.public_bookings FROM PUBLIC, anon;

CREATE POLICY agendix_alert_topics_recipient_only
  ON realtime.messages AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (
    COALESCE(realtime.topic(), '') NOT LIKE 'alerts:%'
    OR (
      extension = 'broadcast'
      AND realtime.topic() = 'alerts:' || (SELECT auth.uid())::text
    )
  );

CREATE POLICY agendix_alert_topics_receive
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    extension = 'broadcast'
    AND realtime.topic() = 'alerts:' || (SELECT auth.uid())::text
  );

CREATE POLICY agendix_alert_topics_server_send_only
  ON realtime.messages AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (COALESCE(realtime.topic(), '') NOT LIKE 'alerts:%');

CREATE FUNCTION public.broadcast_notification_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM realtime.send('{}'::jsonb, 'changed', 'alerts:' || NEW.user_id, true);
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notification_broadcast_failed (%).', SQLSTATE;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.broadcast_notification_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER broadcast_notification_change
  AFTER INSERT OR UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_notification_change();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
  END IF;
END;
$$;

COMMIT;
