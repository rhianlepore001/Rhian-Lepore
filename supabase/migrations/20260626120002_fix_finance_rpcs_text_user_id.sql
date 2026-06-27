-- ==========================================================================
-- MIGRATION: Fix cast de tipo (TEXT user_id) em RPCs de Comissões/Insights
-- ==========================================================================
-- Mesmo bug sistêmico da get_dashboard_stats/get_client_insights: funções com
-- assinatura (uuid) comparavam `user_id = p_user_id` em colunas TEXT
-- (finance_records.user_id, appointments.user_id, clients.user_id), lançando
-- `operator does not exist: text = uuid` (SQLSTATE 42883 -> HTTP 404).
--
-- Telas afetadas: Comissões (detalhe + resumo por profissional) e Insights.
--
-- FIX: comparar com `p_user_id::text`. professional_id permanece uuid (a
-- coluna finance_records.professional_id é uuid de fato).
--
-- NOTA (não corrigido aqui — bug de lógica separado): get_dashboard_insights
-- filtra status IN ('confirmed','completed') em minúsculas, mas o restante do
-- schema usa 'Confirmed'/'Completed' capitalizados. Verificar se essa função
-- está realmente em uso antes de ajustar a capitalização.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.get_professional_commission_details(p_user_id uuid, p_professional_id uuid, p_start_date date, p_end_date date)
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

CREATE OR REPLACE FUNCTION public.get_professional_finance_summary(p_user_id uuid, p_professional_id uuid, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
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

CREATE OR REPLACE FUNCTION public.get_dashboard_insights(p_user_id uuid, p_start_date date, p_end_date date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_total_appointments INT;
  v_new_clients INT;
  v_active_clients INT;
  v_top_professionals JSON;
  v_top_services JSON;
  v_appointments_by_day JSON;
  v_result JSON;
BEGIN
  SELECT COUNT(*) INTO v_total_appointments
  FROM appointments
  WHERE user_id = p_user_id::text
    AND appointment_time::date BETWEEN p_start_date AND p_end_date
    AND status IN ('confirmed', 'completed');

  SELECT COUNT(*) INTO v_new_clients
  FROM clients
  WHERE user_id = p_user_id::text
    AND created_at::date BETWEEN p_start_date AND p_end_date;

  SELECT COUNT(DISTINCT client_id) INTO v_active_clients
  FROM appointments
  WHERE user_id = p_user_id::text
    AND appointment_time::date BETWEEN p_start_date AND p_end_date
    AND status IN ('confirmed', 'completed');

  SELECT json_agg(t) INTO v_top_professionals
  FROM (
    SELECT tm.name, COUNT(a.id) as count, COALESCE(SUM(a.price), 0) as revenue
    FROM appointments a
    LEFT JOIN team_members tm ON a.professional_id = tm.id
    WHERE a.user_id = p_user_id::text
      AND a.appointment_time::date BETWEEN p_start_date AND p_end_date
      AND a.status IN ('confirmed', 'completed')
    GROUP BY tm.name
    ORDER BY count DESC
    LIMIT 5
  ) t;

  SELECT json_agg(t) INTO v_top_services
  FROM (
    SELECT a.service as name, COUNT(a.id) as count
    FROM appointments a
    WHERE a.user_id = p_user_id::text
      AND a.appointment_time::date BETWEEN p_start_date AND p_end_date
      AND a.status IN ('confirmed', 'completed')
    GROUP BY a.service
    ORDER BY count DESC
    LIMIT 5
  ) t;

  SELECT json_agg(t) INTO v_appointments_by_day
  FROM (
    SELECT TO_CHAR(appointment_time, 'DD/MM') as name, COUNT(*) as count
    FROM appointments
    WHERE user_id = p_user_id::text
      AND appointment_time::date BETWEEN p_start_date AND p_end_date
      AND status IN ('confirmed', 'completed')
    GROUP BY 1
    ORDER BY MIN(appointment_time)
  ) t;

  v_result := json_build_object(
    'total_appointments', COALESCE(v_total_appointments, 0),
    'new_clients', COALESCE(v_new_clients, 0),
    'active_clients', COALESCE(v_active_clients, 0),
    'top_professionals', COALESCE(v_top_professionals, '[]'::json),
    'top_services', COALESCE(v_top_services, '[]'::json),
    'appointments_by_day', COALESCE(v_appointments_by_day, '[]'::json)
  );

  RETURN v_result;
END;
$function$;
