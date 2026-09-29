-- Harness (Postgres local descartável) para 20260929110000_commissions_owner_only.
-- Funções copiadas de prod (pg_get_functiondef em 29/09/2026, md5 conferido no script).
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
-- Como no Supabase: funções novas não são executáveis por PUBLIC por padrão
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

CREATE TABLE public.profiles (id text PRIMARY KEY, role text, company_id text);
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, name text NOT NULL,
  photo_url text, is_owner boolean DEFAULT false, active boolean DEFAULT true,
  commission_rate numeric, commission_percent numeric, staff_user_id uuid, deleted_at timestamptz
);
CREATE TABLE public.clients (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text, name text);
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text, client_id uuid, professional_id uuid,
  service text, status text, appointment_time timestamptz
);
CREATE TABLE public.finance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text, professional_id uuid, appointment_id uuid,
  type text, revenue numeric, commission_rate numeric, commission_value numeric,
  commission_paid boolean DEFAULT false, created_at timestamptz DEFAULT now()
);
CREATE TABLE public.product_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, professional_id uuid,
  finance_record_id uuid, quantity integer, created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.get_auth_company_id()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id TEXT;
BEGIN
  SELECT COALESCE(NULLIF(btrim(company_id), ''), id)
    INTO v_company_id
  FROM public.profiles
  WHERE id = auth.uid()::text;
  RETURN v_company_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_auth_role()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid()::text;
  RETURN v_role;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_auth_company_id(), public.get_auth_role() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_professional_commission_details__tenant_unsafe(p_user_id uuid, p_professional_id uuid, p_start_date date, p_end_date date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_records JSON;
    v_summary JSON;
BEGIN
    SELECT JSON_AGG(t)
    INTO v_records
    FROM (
        SELECT
            fr.id, fr.appointment_id, fr.revenue, fr.commission_rate,
            fr.commission_value, fr.commission_paid, fr.created_at,
            a.service as service_name, c.name as client_name
        FROM finance_records fr
        JOIN appointments a ON fr.appointment_id = a.id
        JOIN clients c ON a.client_id = c.id
        WHERE fr.user_id = p_user_id::text
          AND fr.professional_id = p_professional_id
          AND fr.type = 'revenue'
          AND fr.created_at::DATE BETWEEN p_start_date AND p_end_date
        ORDER BY fr.created_at DESC
    ) t;

    SELECT JSON_BUILD_OBJECT(
        'total_revenue', COALESCE(SUM(revenue), 0),
        'total_commission_earned', COALESCE(SUM(commission_value), 0),
        'total_commission_paid', COALESCE(SUM(CASE WHEN commission_paid = TRUE THEN commission_value ELSE 0 END), 0),
        'total_commission_due', COALESCE(SUM(CASE WHEN commission_paid = FALSE THEN commission_value ELSE 0 END), 0)
    )
    INTO v_summary
    FROM finance_records
    WHERE user_id = p_user_id::text
      AND professional_id = p_professional_id
      AND type = 'revenue'
      AND created_at::DATE BETWEEN p_start_date AND p_end_date;

    RETURN JSON_BUILD_OBJECT('summary', v_summary, 'records', COALESCE(v_records, '[]'::JSON));
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_professional_finance_summary__tenant_unsafe(p_user_id uuid, p_professional_id uuid, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_total_earned NUMERIC;
    v_total_due NUMERIC;
BEGIN
    IF p_start_date IS NULL THEN
        p_start_date := date_trunc('month', CURRENT_DATE);
    END IF;
    IF p_end_date IS NULL THEN
        p_end_date := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date;
    END IF;

    SELECT COALESCE(SUM(commission_value), 0)
    INTO v_total_earned
    FROM finance_records
    WHERE user_id = p_user_id::text
      AND professional_id = p_professional_id
      AND created_at::DATE BETWEEN p_start_date AND p_end_date;

    SELECT COALESCE(SUM(commission_value), 0)
    INTO v_total_due
    FROM finance_records
    WHERE user_id = p_user_id::text
      AND professional_id = p_professional_id
      AND commission_paid = FALSE
      AND created_at::DATE BETWEEN p_start_date AND p_end_date;

    RETURN json_build_object('total_earned', v_total_earned, 'total_due', v_total_due);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_commissions_due()
 RETURNS TABLE(professional_id uuid, professional_name text, photo_url text, is_owner boolean, total_due numeric, total_earnings_month numeric, total_paid numeric, total_pending_records bigint, commission_rate numeric, services_pending bigint, products_pending bigint, services_month bigint, products_sold_month bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_auth_company_id TEXT;
  v_start_date TIMESTAMP;
  v_end_date TIMESTAMP;
BEGIN
  SELECT COALESCE(get_auth_company_id()::TEXT, auth.uid()::TEXT)
  INTO v_auth_company_id;

  IF v_auth_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_start_date := DATE_TRUNC('month', NOW());
  v_end_date := (DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 millisecond');

  RETURN QUERY
  SELECT
    tm.id AS professional_id,
    tm.name::TEXT AS professional_name,
    tm.photo_url,
    COALESCE(tm.is_owner, FALSE) AS is_owner,
    COALESCE(agg.total_due, 0)::NUMERIC AS total_due,
    COALESCE(agg.total_earnings_month, 0)::NUMERIC AS total_earnings_month,
    COALESCE(agg.total_paid, 0)::NUMERIC AS total_paid,
    COALESCE(agg.total_pending_records, 0)::BIGINT AS total_pending_records,
    COALESCE(tm.commission_rate, tm.commission_percent, 0)::NUMERIC AS commission_rate,
    COALESCE(agg.services_pending, 0)::BIGINT AS services_pending,
    COALESCE(agg.products_pending, 0)::BIGINT AS products_pending,
    COALESCE(svc.services_month, 0)::BIGINT AS services_month,
    COALESCE(prd.products_sold_month, 0)::BIGINT AS products_sold_month
  FROM public.team_members tm
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(
        SUM(CASE WHEN fr.commission_paid = FALSE THEN fr.commission_value ELSE 0 END),
        0
      ) AS total_due,
      COALESCE(
        SUM(
          CASE
            WHEN fr.created_at >= v_start_date AND fr.created_at <= v_end_date
            THEN fr.commission_value
            ELSE 0
          END
        ),
        0
      ) AS total_earnings_month,
      COALESCE(
        SUM(
          CASE
            WHEN fr.commission_paid = TRUE
             AND fr.created_at >= v_start_date
             AND fr.created_at <= v_end_date
            THEN fr.commission_value
            ELSE 0
          END
        ),
        0
      ) AS total_paid,
      COUNT(*) FILTER (
        WHERE fr.commission_paid = FALSE AND COALESCE(fr.commission_value, 0) > 0
      ) AS total_pending_records,
      COUNT(*) FILTER (
        WHERE fr.commission_paid = FALSE
          AND COALESCE(fr.commission_value, 0) > 0
          AND NOT EXISTS (
            SELECT 1 FROM public.product_sales ps WHERE ps.finance_record_id = fr.id
          )
      ) AS services_pending,
      COUNT(*) FILTER (
        WHERE fr.commission_paid = FALSE
          AND COALESCE(fr.commission_value, 0) > 0
          AND EXISTS (
            SELECT 1 FROM public.product_sales ps WHERE ps.finance_record_id = fr.id
          )
      ) AS products_pending
    FROM public.finance_records fr
    WHERE fr.professional_id = tm.id
      AND fr.user_id::TEXT = v_auth_company_id
      AND COALESCE(fr.commission_value, 0) > 0
  ) agg ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT AS services_month
    FROM public.appointments a
    WHERE a.professional_id = tm.id
      AND a.user_id::TEXT = v_auth_company_id
      AND a.status = 'Completed'
      AND a.appointment_time >= v_start_date
      AND a.appointment_time <= v_end_date
  ) svc ON TRUE
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(ps.quantity), 0)::BIGINT AS products_sold_month
    FROM public.product_sales ps
    WHERE ps.professional_id = tm.id
      AND ps.company_id::TEXT = v_auth_company_id
      AND ps.created_at >= v_start_date
      AND ps.created_at <= v_end_date
  ) prd ON TRUE
  WHERE tm.user_id::TEXT = v_auth_company_id
    AND tm.active = TRUE
  ORDER BY tm.name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_professional_commission_details(p_user_id uuid, p_professional_id uuid, p_start_date date, p_end_date date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_auth_company_id TEXT;
BEGIN
  v_auth_company_id := COALESCE(get_auth_company_id()::TEXT, auth.uid()::TEXT);
  IF v_auth_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.get_professional_commission_details__tenant_unsafe(v_auth_company_id::uuid, p_professional_id, p_start_date, p_end_date);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_professional_finance_summary(p_user_id uuid, p_professional_id uuid, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_auth_company_id TEXT;
BEGIN
  v_auth_company_id := COALESCE(get_auth_company_id()::TEXT, auth.uid()::TEXT);
  IF v_auth_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.get_professional_finance_summary__tenant_unsafe(v_auth_company_id::uuid, p_professional_id, p_start_date, p_end_date);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_professional_commission_details__tenant_unsafe(uuid,uuid,date,date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_professional_finance_summary__tenant_unsafe(uuid,uuid,date,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_professional_commission_details__tenant_unsafe(uuid,uuid,date,date) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_professional_finance_summary__tenant_unsafe(uuid,uuid,date,date) TO service_role;
REVOKE ALL ON FUNCTION public.get_commissions_due() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_professional_commission_details(uuid,uuid,date,date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_professional_finance_summary(uuid,uuid,date,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_commissions_due() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_professional_commission_details(uuid,uuid,date,date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_professional_finance_summary(uuid,uuid,date,date) TO authenticated, service_role;

-- Dados: empresa A (dono a0, staff a1 ativo, a2 ex-staff c/ vínculo excluído mas company_id ainda setado),
-- empresa B (dono b0, staff b1). Staff a1 = membro 'Ana'; colega 'Bruno' (sem login).
INSERT INTO public.profiles VALUES
  ('00000000-0000-0000-0000-0000000000a0', 'owner', NULL),
  ('00000000-0000-0000-0000-0000000000a1', 'staff', '00000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-0000000000a2', 'staff', '00000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-0000000000b0', 'owner', NULL),
  ('00000000-0000-0000-0000-0000000000b1', 'staff', '00000000-0000-0000-0000-0000000000b0');
INSERT INTO public.team_members (id, user_id, name, is_owner, active, commission_rate, staff_user_id, deleted_at) VALUES
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a0', 'Dono A', true,  true, 0,  NULL, NULL),
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a0', 'Ana',    false, true, 40, '00000000-0000-0000-0000-0000000000a1', NULL),
  ('10000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a0', 'Bruno',  false, true, 50, NULL, NULL),
  ('10000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a0', 'Ex',     false, false, 30, '00000000-0000-0000-0000-0000000000a2', now()),
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b0', 'Beto',   false, true, 45, '00000000-0000-0000-0000-0000000000b1', NULL);
INSERT INTO public.clients (id, user_id, name) VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a0', 'Cliente');
INSERT INTO public.appointments (id, user_id, client_id, professional_id, service, status, appointment_time) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a0', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-0000000000a3', 'Corte', 'Completed', now());
INSERT INTO public.finance_records (user_id, professional_id, appointment_id, type, revenue, commission_rate, commission_value) VALUES
  ('00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a3', '30000000-0000-0000-0000-000000000001', 'revenue', 100, 50, 50),
  ('00000000-0000-0000-0000-0000000000a0', '10000000-0000-0000-0000-0000000000a1', NULL, 'revenue', 80, 40, 32),
  ('00000000-0000-0000-0000-0000000000b0', '10000000-0000-0000-0000-0000000000b1', NULL, 'revenue', 60, 45, 27);
