CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE SCHEMA realtime;

CREATE TABLE realtime.messages (extension text NOT NULL);
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA realtime TO anon, authenticated;
GRANT SELECT ON realtime.messages TO anon, authenticated;

CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT current_setting('realtime.topic', true);
$$;

CREATE TABLE public.profiles (id text PRIMARY KEY, company_id text);
INSERT INTO public.profiles VALUES
  ('owner-a', NULL), ('staff-a', 'owner-a'), ('owner-b', NULL);

CREATE FUNCTION public.get_auth_company_id() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(company_id, id)
  FROM public.profiles
  WHERE id = current_setting('test.user_id', true);
$$;

INSERT INTO realtime.messages VALUES ('broadcast'), ('presence');

CREATE POLICY "Booking topics are readable"
ON realtime.messages FOR SELECT TO anon, authenticated
USING (realtime.topic() LIKE 'booking:%' AND extension = 'broadcast');

\ir ../migrations/20261120131544_queue_realtime_tenant_scope.sql

SET ROLE anon;
SET realtime.topic = 'queue:owner-a';
DO $$
BEGIN
  IF EXISTS (SELECT FROM realtime.messages) THEN
    RAISE EXCEPTION 'anonymous role can read queue broadcasts';
  END IF;
END;
$$;

SET realtime.topic = 'booking:fixture';
DO $$
BEGIN
  IF (SELECT count(*) FROM realtime.messages) <> 1 THEN
    RAISE EXCEPTION 'existing booking channel policy was changed';
  END IF;
END;
$$;

RESET ROLE;
SET ROLE authenticated;
SET test.user_id = 'owner-a';
SET realtime.topic = 'queue:owner-a';
DO $$
BEGIN
  IF (SELECT array_agg(extension) FROM realtime.messages) IS DISTINCT FROM ARRAY['broadcast'] THEN
    RAISE EXCEPTION 'an owner must receive their queue broadcasts only';
  END IF;
END;
$$;

SET test.user_id = 'staff-a';
DO $$
BEGIN
  IF (SELECT count(*) FROM realtime.messages) <> 1 THEN
    RAISE EXCEPTION 'staff must receive company queue broadcasts';
  END IF;
END;
$$;

SET realtime.topic = 'queue:owner-b';
DO $$
BEGIN
  IF EXISTS (SELECT FROM realtime.messages) THEN
    RAISE EXCEPTION 'staff can read queue broadcasts from another company';
  END IF;
END;
$$;

SET test.user_id = 'owner-b';
SET realtime.topic = 'queue:owner-a';
DO $$
BEGIN
  IF EXISTS (SELECT FROM realtime.messages) THEN
    RAISE EXCEPTION 'another owner can read queue broadcasts';
  END IF;
END;
$$;

RESET ROLE;

\ir ../../docs/rollbacks/20261120131544_queue_realtime_tenant_scope.rollback.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies
    WHERE schemaname = 'realtime' AND tablename = 'messages'
      AND policyname = 'Queue topics are readable'
      AND roles = ARRAY['anon', 'authenticated']::name[]
  ) THEN
    RAISE EXCEPTION 'rollback must restore previous policy roles';
  END IF;
END;
$$;
