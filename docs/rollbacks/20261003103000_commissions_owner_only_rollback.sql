-- Rollback EXATO de 20261003103000_commissions_owner_only.sql
-- Restaura as 3 RPCs de comissão com o texto de pg_get_functiondef de prod
-- (lido em 29/09/2026). md5(pg_get_functiondef) esperado depois do rollback:
--   get_commissions_due() = 1bc9f34247a83770550e0be36b7fd3dd
--   get_professional_commission_details(uuid,uuid,date,date) = 0786c74526378c31e3f2b79327795bd0
--   get_professional_finance_summary(uuid,uuid,date,date) = 5bddbd851bd951479dd344ad59da03cf
-- ATENÇÃO: o corpo de get_commissions_due em prod usa CRLF; este arquivo
-- preserva os \r de propósito (senão o md5 muda). Não normalize fins de linha.
BEGIN;
SET LOCAL lock_timeout = '5s';

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

REVOKE ALL ON FUNCTION public.get_commissions_due() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_professional_commission_details(uuid,uuid,date,date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_professional_finance_summary(uuid,uuid,date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_commissions_due() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_professional_commission_details(uuid,uuid,date,date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_professional_finance_summary(uuid,uuid,date,date) TO authenticated, service_role;

COMMIT;
