-- Harness local e descartável para 20260925160000_noshow_frees_slot.
-- Reproduz de prod (2026-09-25) o que decide se um horário está ocupado:
--   tabelas/colunas usadas, auth.uid(), get_auth_company_id, business_timezone,
--   get_full_dates e create_public_booking (fontes do repo com md5 de
--   pg_get_functiondef IGUAL ao de prod). get_available_slots,
--   public_booking_slot_busy e create_secure_booking(uuid) entram pelo arquivo
--   de rollback (= definições exatas de prod). Nada aqui toca prod.

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE TABLE public.profiles (id text PRIMARY KEY, role text DEFAULT 'owner', company_id text, region text);
CREATE TABLE public.business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text UNIQUE NOT NULL,
  business_hours jsonb DEFAULT '{}'::jsonb, timezone text
);
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY, user_id text NOT NULL, name text NOT NULL, active boolean DEFAULT true,
  deleted_at timestamptz, staff_user_id uuid
);
CREATE TABLE public.services (id uuid PRIMARY KEY, user_id text NOT NULL, name text NOT NULL, price numeric NOT NULL, duration_minutes integer NOT NULL);
CREATE TABLE public.clients (id uuid PRIMARY KEY, user_id text, name text NOT NULL, phone text);
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  service text NOT NULL DEFAULT 'Corte',
  appointment_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'Pending',
  price numeric,
  professional_id uuid REFERENCES public.team_members(id),
  duration_minutes integer DEFAULT 30,
  notes text,
  payment_method text,
  public_booking_id uuid,
  origin text NOT NULL DEFAULT 'agenda',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.public_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id text NOT NULL,
  customer_phone text NOT NULL DEFAULT '000',
  customer_name text,
  customer_email text,
  service_ids uuid[] NOT NULL DEFAULT '{}',
  professional_id uuid,
  appointment_time timestamptz NOT NULL,
  total_price numeric NOT NULL DEFAULT 0,
  notes text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  duration_minutes integer DEFAULT 30,
  payment_method text,
  is_edit boolean DEFAULT false,
  product_lines jsonb NOT NULL DEFAULT '[]'::jsonb
);
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION public.business_timezone(p_business_id text)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_tz text;
  v_region text;
BEGIN
  SELECT NULLIF(trim(bs.timezone), '')
    INTO v_tz
    FROM public.business_settings bs
   WHERE bs.user_id = p_business_id
   LIMIT 1;

  IF v_tz IS NOT NULL THEN
    BEGIN
      -- Valida o nome IANA sem varrer pg_timezone_names (lento).
      PERFORM now() AT TIME ZONE v_tz;
      RETURN v_tz;
    EXCEPTION WHEN OTHERS THEN
      v_tz := NULL; -- inválido: cai para a região
    END;
  END IF;

  SELECT upper(trim(p.region))
    INTO v_region
    FROM public.profiles p
   WHERE p.id::text = p_business_id
   LIMIT 1;

  IF v_region = 'PT' THEN
    RETURN 'Europe/Lisbon';
  END IF;

  -- BR e região desconhecida: America/Sao_Paulo (comportamento histórico do
  -- app para não-PT e mercado majoritário; o dono pode alterar em Ajustes).
  RETURN 'America/Sao_Paulo';
END;
$$;

CREATE OR REPLACE FUNCTION public.create_public_booking(
  p_business_id TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_service_ids UUID[],
  p_professional_id UUID,
  p_appointment_time TIMESTAMPTZ,
  p_total_price NUMERIC,
  p_duration_minutes INTEGER,
  p_product_lines JSONB DEFAULT '[]'::jsonb
)
RETURNS SETOF public.public_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id TEXT;
  v_duration INTEGER;
  v_booking public.public_bookings%ROWTYPE;
BEGIN
  v_business_id := btrim(COALESCE(p_business_id, ''));
  IF v_business_id = '' THEN
    RAISE EXCEPTION 'invalid_business';
  END IF;

  IF btrim(COALESCE(p_customer_name, '')) = '' OR btrim(COALESCE(p_customer_phone, '')) = '' THEN
    RAISE EXCEPTION 'invalid_customer';
  END IF;

  IF p_service_ids IS NULL OR array_length(p_service_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'invalid_services';
  END IF;

  IF p_appointment_time IS NULL OR p_appointment_time <= NOW() THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

  v_duration := GREATEST(COALESCE(p_duration_minutes, 30), 1);

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_business_id
  ) THEN
    RAISE EXCEPTION 'invalid_business';
  END IF;

  IF p_professional_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.id = p_professional_id
      AND tm.user_id::text = v_business_id
      AND tm.active = true
      AND tm.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'invalid_professional';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_business_id, 0));

  IF public.public_booking_slot_busy(
    v_business_id,
    p_appointment_time,
    v_duration,
    p_professional_id
  ) THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

  INSERT INTO public.public_bookings (
    business_id,
    customer_name,
    customer_phone,
    service_ids,
    professional_id,
    appointment_time,
    total_price,
    status,
    duration_minutes,
    product_lines
  ) VALUES (
    v_business_id,
    btrim(p_customer_name),
    btrim(p_customer_phone),
    p_service_ids,
    p_professional_id,
    p_appointment_time,
    COALESCE(p_total_price, 0),
    'pending',
    v_duration,
    COALESCE(p_product_lines, '[]'::jsonb)
  )
  RETURNING * INTO v_booking;

  RETURN NEXT v_booking;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_company_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id TEXT;
BEGIN
  SELECT COALESCE(NULLIF(btrim(company_id), ''), id)
    INTO v_company_id
  FROM public.profiles
  WHERE id = auth.uid()::text;
  RETURN v_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_full_dates(p_business_id uuid, p_start_date date, p_end_date date, p_professional_id uuid DEFAULT NULL::uuid, p_duration_min integer DEFAULT 30)
 RETURNS date[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 DECLARE
   v_date date;
   v_full_dates date[] := ARRAY[]::date[];
   v_slots_resp json;
   v_duration integer := GREATEST(COALESCE(p_duration_min, 30), 15);
 BEGIN
   FOR v_date IN SELECT (generate_series(p_start_date, p_end_date, '1 day'::interval))::date
   LOOP
     -- Chamada para get_available_slots com p_is_professional = false
     v_slots_resp := public.get_available_slots(p_business_id, v_date, p_professional_id, v_duration, false);
     IF json_array_length(v_slots_resp->'slots') = 0 THEN
       v_full_dates := array_append(v_full_dates, v_date);
     END IF;
   END LOOP;
   RETURN v_full_dates;
 END;
 $function$
;


-- ACLs como em prod (proacl lido em 2026-09-25)
REVOKE ALL ON FUNCTION public.create_public_booking(text,text,text,uuid[],uuid,timestamptz,numeric,integer,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_booking(text,text,text,uuid[],uuid,timestamptz,numeric,integer,jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_full_dates(uuid,date,date,uuid,integer) TO PUBLIC;
