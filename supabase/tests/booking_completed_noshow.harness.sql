-- Harness local para 20261004072408_public_booking_completed_noshow.
-- Postgres descartável. Não toca o Supabase de produção.

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE TABLE public.profiles (id text PRIMARY KEY, role text, company_id text);
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY, user_id text, name text, staff_user_id uuid, deleted_at timestamptz,
  active boolean DEFAULT true, is_owner boolean DEFAULT false, display_order integer,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text, name text, phone text,
  email text, photo_url text
);
CREATE TABLE public.services (
  id uuid PRIMARY KEY, user_id text, name text, price numeric, duration_minutes integer
);
CREATE TABLE public.public_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id text NOT NULL REFERENCES public.profiles(id) ON UPDATE CASCADE,
  customer_phone text NOT NULL,
  customer_name text,
  customer_email text,
  service_ids uuid[] NOT NULL,
  professional_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  appointment_time timestamptz NOT NULL,
  total_price numeric NOT NULL,
  notes text,
  status text DEFAULT 'pending'
    CONSTRAINT public_bookings_status_check CHECK (status = ANY (ARRAY['pending','confirmed','cancelled','completed'])),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  duration_minutes integer DEFAULT 30
);
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text REFERENCES public.profiles(id) ON UPDATE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  service text,
  appointment_time timestamptz,
  status text,
  price numeric,
  created_at timestamptz DEFAULT now(),
  professional_id uuid REFERENCES public.team_members(id),
  duration_minutes integer,
  public_booking_id uuid CONSTRAINT appointments_public_booking_id_fkey REFERENCES public.public_bookings(id),
  updated_at timestamptz DEFAULT now(),
  origin text NOT NULL DEFAULT 'agenda' CHECK (origin = ANY (ARRAY['agenda','queue','booking']))
);

CREATE OR REPLACE FUNCTION public.phones_match(p_a text, p_b text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN regexp_replace(COALESCE(p_a, ''), '\D', '', 'g') = '' THEN false
      WHEN regexp_replace(COALESCE(p_b, ''), '\D', '', 'g') = '' THEN false
      WHEN regexp_replace(p_a, '\D', '', 'g') = regexp_replace(p_b, '\D', '', 'g') THEN true
      ELSE (
        length(regexp_replace(p_a, '\D', '', 'g')) >= 8
        AND length(regexp_replace(p_b, '\D', '', 'g')) >= 8
        AND right(regexp_replace(p_a, '\D', '', 'g'), 8) = right(regexp_replace(p_b, '\D', '', 'g'), 8)
      )
    END;
$$;
GRANT EXECUTE ON FUNCTION public.phones_match(text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_client_bookings_history(p_phone text, p_business_id uuid)
RETURNS TABLE (
  id uuid, appointment_time timestamptz, status text, service_ids uuid[],
  service_names text[], professional_id uuid, professional_name text,
  total_price decimal, duration_minutes integer, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT pb.id, pb.appointment_time, pb.status::text, pb.service_ids,
         ARRAY[]::text[], pb.professional_id, tm.name, pb.total_price,
         pb.duration_minutes, pb.created_at
  FROM public_bookings pb
  LEFT JOIN team_members tm ON tm.id = pb.professional_id
  WHERE pb.customer_phone = p_phone
    AND pb.business_id = p_business_id::text
  ORDER BY pb.appointment_time DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_client_bookings_history(text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_booking_linked_appointments(p_booking_id uuid)
RETURNS TABLE(appointment_id uuid, status text, updated_at timestamptz)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT a.id, a.status, a.updated_at
  FROM public.public_bookings pb
  JOIN public.appointments a ON a.user_id = pb.business_id
  WHERE pb.id = p_booking_id
    AND (
      a.public_booking_id = pb.id
      OR (
        a.public_booking_id IS NULL
        AND a.appointment_time = pb.appointment_time
        AND (pb.professional_id IS NULL OR a.professional_id = pb.professional_id)
        AND EXISTS (
          SELECT 1 FROM public.clients c
          WHERE c.id = a.client_id
            AND public.phones_match(c.phone, pb.customer_phone)
        )
      )
    );
$function$;
REVOKE ALL ON FUNCTION public.public_booking_linked_appointments(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_booking_linked_appointments(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.sync_public_booking_on_appointment_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    UPDATE public.public_bookings pb
       SET status = 'cancelled', updated_at = NOW()
     WHERE pb.business_id = NEW.user_id
       AND pb.status = 'confirmed'
       AND (
         pb.id = NEW.public_booking_id
         OR (NEW.public_booking_id IS NULL AND pb.appointment_time = NEW.appointment_time)
       )
       AND EXISTS (
         SELECT 1 FROM public.public_booking_linked_appointments(pb.id) l
         WHERE l.appointment_id = NEW.id
       )
       AND NOT EXISTS (
         SELECT 1 FROM public.public_booking_linked_appointments(pb.id) l
         WHERE l.status IS DISTINCT FROM 'Cancelled'
       );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_public_booking_on_appointment_cancel(%): %', NEW.id, SQLERRM;
  END;
  RETURN NULL;
END;
$function$;
CREATE TRIGGER sync_public_booking_on_appointment_cancel
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW
  WHEN (NEW.status = 'Cancelled' AND OLD.status IS DISTINCT FROM 'Cancelled')
  EXECUTE FUNCTION public.sync_public_booking_on_appointment_cancel();

-- Objetos #120 / #121 / #122: o rollback deste PR não pode removê-los.
CREATE OR REPLACE FUNCTION public.enforce_lead_time_on_public_bookings()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END; $$;
CREATE TRIGGER enforce_lead_time_on_public_bookings
BEFORE INSERT OR UPDATE ON public.public_bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_lead_time_on_public_bookings();

CREATE OR REPLACE FUNCTION public.reschedule_appointment(uuid, timestamptz, uuid)
RETURNS uuid LANGUAGE sql AS $$ SELECT $1 $$;

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
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('test.realtime_topic', true), '')
$$;
CREATE TABLE realtime.send_log (
  payload jsonb NOT NULL, event text NOT NULL, topic text NOT NULL, private boolean
);
CREATE OR REPLACE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO realtime.send_log(payload, event, topic, private)
  VALUES (payload, event, topic, private);
END;
$$;
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
        'id', NEW.id, 'status', NEW.status, 'appointment_time', NEW.appointment_time,
        'op', TG_OP, 'at', now()
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
CREATE TRIGGER public_bookings_broadcast_trg
AFTER INSERT OR UPDATE OF status, appointment_time ON public.public_bookings
FOR EACH ROW EXECUTE FUNCTION public.public_bookings_broadcast();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Dados de teste
INSERT INTO public.profiles (id, role, company_id) VALUES
  ('00000000-0000-0000-0000-0000000000a0', 'owner', '00000000-0000-0000-0000-0000000000a0');
INSERT INTO public.team_members (id, user_id, name, is_owner)
VALUES ('10000000-0000-0000-0000-0000000000a0', '00000000-0000-0000-0000-0000000000a0', 'Mário', true);
INSERT INTO public.clients (id, user_id, name, phone)
VALUES ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a0', 'Ana', '351912345678');
INSERT INTO public.services (id, user_id, name, price, duration_minutes)
VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a0', 'Corte', 35, 30);
