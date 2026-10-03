-- Harness local e descartável para 20261003210000_public_bookings_realtime.
-- Stub de realtime.send / realtime.topic / realtime.messages e objetos #120/#121.

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE TABLE public.profiles (id text PRIMARY KEY, role text, company_id text);

CREATE TABLE public.public_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id text NOT NULL,
  customer_phone text NOT NULL,
  customer_name text,
  service_ids uuid[] NOT NULL DEFAULT '{}',
  professional_id uuid,
  appointment_time timestamptz NOT NULL,
  total_price numeric NOT NULL DEFAULT 0,
  notes text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  duration_minutes integer DEFAULT 30
);

-- Objetos #121 / #120: o rollback deste PR não pode removê-los.
CREATE OR REPLACE FUNCTION public.enforce_lead_time_on_public_bookings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_lead_time_on_public_bookings
BEFORE INSERT OR UPDATE ON public.public_bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_lead_time_on_public_bookings();

CREATE OR REPLACE FUNCTION public.reschedule_appointment(uuid, timestamptz, uuid)
RETURNS uuid
LANGUAGE sql
AS $$ SELECT $1 $$;

CREATE SCHEMA realtime;

CREATE TABLE realtime.messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  topic text,
  extension text
);
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON realtime.messages TO anon, authenticated;
GRANT USAGE ON SCHEMA realtime TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION realtime.topic()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('test.realtime_topic', true), '')
$$;

CREATE TABLE realtime.send_log (
  payload jsonb NOT NULL,
  event text NOT NULL,
  topic text NOT NULL,
  private boolean
);

CREATE OR REPLACE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('test.realtime_fail', true) = 'on' THEN
    RAISE EXCEPTION 'simulated realtime failure';
  END IF;
  INSERT INTO realtime.send_log(payload, event, topic, private)
  VALUES (payload, event, topic, private);
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;
