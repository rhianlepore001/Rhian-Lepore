CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE SCHEMA auth;
CREATE SCHEMA realtime;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT current_setting('realtime.topic', true);
$$;
CREATE TABLE realtime.messages (extension text, topic text, event text, payload jsonb, private boolean);
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_legacy_read ON realtime.messages FOR SELECT USING (true);
CREATE POLICY fixture_legacy_send ON realtime.messages FOR INSERT WITH CHECK (true);
GRANT USAGE ON SCHEMA auth, realtime TO anon, authenticated;
GRANT SELECT, INSERT ON realtime.messages TO anon, authenticated;
CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO realtime.messages VALUES ('broadcast', topic, event, payload, private);
$$;

CREATE TABLE public.public_bookings (id uuid);
ALTER TABLE public.public_bookings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.public_bookings TO anon, authenticated;
CREATE TABLE public.notifications (user_id text, message text);
CREATE PUBLICATION supabase_realtime FOR TABLE public.notifications, public.public_bookings;

\ir ../migrations/20261120131507_scope_alert_realtime_access.sql
\ir alert_realtime.test.sql
\ir ../../docs/rollbacks/20261120131507_scope_alert_realtime_access.rollback.sql

DO $$
BEGIN
  IF NOT has_table_privilege('anon', 'public.public_bookings', 'SELECT')
    OR NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
    RAISE EXCEPTION 'Rollback did not restore relation privileges and publication';
  END IF;
END;
$$;
