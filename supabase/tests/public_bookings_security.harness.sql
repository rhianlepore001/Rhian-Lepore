-- Harness: public_bookings igual a prod (lcqwrngscsziysyfhpfj, lido em 2026-10-11, só SELECT).
-- Carregar DEPOIS da cadeia do test-sql-auto-confirm-online-bookings.sh + harness/migration
-- 20261011161117 (= funções de booking de prod). Reproduz:
--   - RLS ligado, as 5 policies de prod (texto de pg_policy) e a ACL da tabela;
--   - as RPCs públicas de leitura que a cadeia não cria (pg_get_functiondef de prod,
--     md5 conferido pelo script), com os mesmos grants.

ALTER TABLE public.public_bookings ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT polname FROM pg_policy WHERE polrelid = 'public.public_bookings'::regclass LOOP
    EXECUTE format('DROP POLICY %I ON public.public_bookings', r.polname);
  END LOOP;
END $$;

CREATE POLICY "Owner can manage public_bookings" ON public.public_bookings
  FOR ALL TO authenticated
  USING ((auth.uid())::text = business_id) WITH CHECK ((auth.uid())::text = business_id);
CREATE POLICY "Public bookings: company read" ON public.public_bookings
  FOR SELECT TO authenticated USING (business_id = get_auth_company_id());
CREATE POLICY "Public bookings: company update" ON public.public_bookings
  FOR UPDATE TO authenticated
  USING (business_id = get_auth_company_id()) WITH CHECK (business_id = get_auth_company_id());

-- business_exists(text): prod md5 429414f18e3e6639bc1690484cae2133
CREATE OR REPLACE FUNCTION public.business_exists(p_business_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_business_id
  );
$function$;
REVOKE ALL ON FUNCTION public.business_exists(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.business_exists(text) TO authenticated, service_role, anon;

-- get_active_booking_by_phone(text,uuid): prod md5 3934d1da02db7afb292d75d8458655f0
CREATE OR REPLACE FUNCTION public.get_active_booking_by_phone(p_phone text, p_business_id uuid)
 RETURNS TABLE(id uuid, customer_name text, customer_phone text, appointment_time timestamp with time zone, service_ids uuid[], status text, business_id text, professional_id uuid, total_price numeric, duration_minutes integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    pb.id,
    pb.customer_name,
    pb.customer_phone,
    pb.appointment_time,
    pb.service_ids,
    pb.status,
    pb.business_id,
    pb.professional_id,
    pb.total_price,
    pb.duration_minutes
  FROM public_bookings pb
  WHERE pb.business_id = p_business_id::text
    AND public.phones_match(pb.customer_phone, p_phone)
    AND pb.status = 'pending'
    AND pb.appointment_time > NOW();
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_active_booking_by_phone(text, uuid) TO PUBLIC, anon, authenticated, service_role;

-- get_client_booking_cancellations(text,uuid): prod md5 887028da4bfd90a0068b6118c7d79772
CREATE OR REPLACE FUNCTION public.get_client_booking_cancellations(p_phone text, p_business_id uuid)
 RETURNS TABLE(booking_id uuid, cancelled_by_business boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT pb.id,
         EXISTS (
           SELECT 1 FROM public.public_booking_linked_appointments(pb.id) l
           WHERE l.status = 'Cancelled'
             AND l.updated_at <= pb.updated_at
         )
  FROM public.public_bookings pb
  WHERE pb.business_id = p_business_id::text
    AND pb.status = 'cancelled'
    AND public.phones_match(pb.customer_phone, p_phone);
$function$;
REVOKE ALL ON FUNCTION public.get_client_booking_cancellations(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_booking_cancellations(text, uuid) TO authenticated, service_role, anon;

-- get_public_booking_by_id(uuid,uuid,text): prod md5 55be6c3d5c909db060159c59a162da13
CREATE OR REPLACE FUNCTION public.get_public_booking_by_id(p_booking_id uuid, p_business_id uuid, p_phone text)
 RETURNS TABLE(id uuid, customer_name text, customer_phone text, appointment_time timestamp with time zone, service_ids uuid[], status text, business_id uuid, professional_id uuid, total_price numeric, duration_minutes integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    pb.id,
    pb.customer_name,
    pb.customer_phone,
    pb.appointment_time,
    pb.service_ids,
    pb.status,
    pb.business_id,
    pb.professional_id,
    pb.total_price,
    pb.duration_minutes
  FROM public_bookings pb
  WHERE pb.id = p_booking_id
    AND pb.business_id = p_business_id::text
    AND public.phones_match(pb.customer_phone, p_phone)
  LIMIT 1;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_booking_by_id(uuid, uuid, text) TO PUBLIC, anon, authenticated, service_role;

-- list_company_pending_public_bookings(): prod md5 01651c25d942e97e112ba6654dbbcf44
CREATE OR REPLACE FUNCTION public.list_company_pending_public_bookings()
 RETURNS SETOF public_bookings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  v_company_id := public.get_auth_company_id();
  IF v_company_id IS NULL OR btrim(v_company_id) = '' THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  RETURN QUERY
  SELECT pb.*
  FROM public.public_bookings pb
  WHERE pb.business_id = v_company_id
    AND pb.status = 'pending'
  ORDER BY pb.appointment_time;
END;
$function$;
REVOKE ALL ON FUNCTION public.list_company_pending_public_bookings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_company_pending_public_bookings() TO authenticated, service_role;

CREATE POLICY public_bookings_insert_anon ON public.public_bookings
  FOR INSERT TO anon, authenticated
  WITH CHECK ((business_id IS NOT NULL) AND (btrim(business_id) <> ''::text) AND business_exists(business_id) AND (COALESCE(status, 'pending'::text) = 'pending'::text));
CREATE POLICY public_bookings_select_anon_fresh ON public.public_bookings
  FOR SELECT TO anon
  USING ((status = 'pending'::text) AND (created_at IS NOT NULL) AND (created_at > (now() - '00:02:00'::interval)));

GRANT ALL ON TABLE public.public_bookings TO anon, authenticated, service_role;
