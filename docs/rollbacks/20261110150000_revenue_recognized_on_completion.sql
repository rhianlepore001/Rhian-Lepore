-- Rollback de 20261110150000_revenue_recognized_on_completion: volta às definições de prod de 10/11/2026.
BEGIN;
DROP TRIGGER IF EXISTS appointments_stamp_completed_at ON public.appointments;
DROP FUNCTION IF EXISTS public.appointments_stamp_completed_at();

CREATE OR REPLACE FUNCTION public.get_finance_stats__tenant_unsafe(p_user_id text, p_start_date text DEFAULT NULL::text, p_end_date text DEFAULT NULL::text, p_professional_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_start_date          TIMESTAMP;
  v_end_date            TIMESTAMP;
  v_revenue             DECIMAL(12,2);
  v_expenses            DECIMAL(12,2);
  v_pending_expenses    DECIMAL(12,2);
  v_commissions_pending DECIMAL(12,2);
  v_profit              DECIMAL(12,2);
  v_chart_data          JSON;
  v_transactions        JSON;
  v_revenue_by_method   JSON;
  v_result              JSON;
  v_auth_company_id     TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.';
  END IF;

  SELECT COALESCE(get_auth_company_id(), auth.uid()::TEXT) INTO v_auth_company_id;

  IF p_user_id::TEXT <> v_auth_company_id THEN
    RAISE EXCEPTION 'Acesso negado ao financeiro do tenant informado.';
  END IF;

  IF p_professional_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE id = p_professional_id
      AND user_id::TEXT = v_auth_company_id
  ) THEN
    RAISE EXCEPTION 'Profissional nao encontrado no tenant autenticado.';
  END IF;

  v_start_date := COALESCE(
    NULLIF(TRIM(p_start_date), '')::TIMESTAMP,
    (NOW() - INTERVAL '30 days')::DATE::TIMESTAMP
  );
  v_end_date := (
    COALESCE(
      NULLIF(TRIM(p_end_date), '')::TIMESTAMP,
      NOW()
    )::DATE + INTERVAL '1 day' - INTERVAL '1 millisecond'
  )::TIMESTAMP;

  -- Receita = serviços concluídos + lançamentos manuais + vendas de produto
  SELECT COALESCE(SUM(amount), 0) INTO v_revenue
  FROM (
    SELECT price AS amount
    FROM public.appointments
    WHERE user_id::TEXT = v_auth_company_id
      AND status = 'Completed'
      AND appointment_time >= v_start_date
      AND appointment_time <= v_end_date
      AND (p_professional_id IS NULL OR professional_id = p_professional_id)

    UNION ALL

    SELECT COALESCE(f.revenue, 0) AS amount
    FROM public.finance_records f
    WHERE f.user_id::TEXT = v_auth_company_id
      AND f.type = 'revenue'
      AND f.created_at >= v_start_date
      AND f.created_at <= v_end_date
      AND (p_professional_id IS NULL OR f.professional_id = p_professional_id)
      AND (
        f.appointment_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.product_sales ps
          WHERE ps.finance_record_id = f.id
        )
      )
  ) combined;

  SELECT COALESCE(SUM(COALESCE(commission_value, 0)), 0)
  INTO v_expenses
  FROM public.finance_records
  WHERE user_id::TEXT = v_auth_company_id
    AND type = 'expense'
    AND commission_paid = TRUE
    AND created_at >= v_start_date
    AND created_at <= v_end_date
    AND (p_professional_id IS NULL OR professional_id = p_professional_id);

  SELECT COALESCE(SUM(COALESCE(commission_value, 0)), 0)
  INTO v_pending_expenses
  FROM public.finance_records
  WHERE user_id::TEXT = v_auth_company_id
    AND type = 'expense'
    AND (commission_paid IS FALSE OR commission_paid IS NULL)
    AND created_at >= v_start_date
    AND created_at <= v_end_date
    AND (p_professional_id IS NULL OR professional_id = p_professional_id);

  SELECT COALESCE(SUM(commission_value), 0)
  INTO v_commissions_pending
  FROM public.finance_records
  WHERE user_id::TEXT = v_auth_company_id
    AND commission_paid = FALSE
    AND commission_value > 0
    AND created_at >= v_start_date
    AND created_at <= v_end_date
    AND (p_professional_id IS NULL OR professional_id = p_professional_id);

  v_profit := v_revenue - v_expenses;

  SELECT json_build_object(
    'pix', COALESCE(SUM(CASE WHEN method = 'pix' THEN amount ELSE 0 END), 0),
    'mbway', COALESCE(SUM(CASE WHEN method = 'mbway' THEN amount ELSE 0 END), 0),
    'dinheiro', COALESCE(SUM(CASE WHEN method IN ('dinheiro','cash') THEN amount ELSE 0 END), 0),
    'cartao', COALESCE(SUM(CASE WHEN method LIKE '%cart%' OR method LIKE '%card%'
                                  OR method IN ('debit','credit') THEN amount ELSE 0 END), 0)
  ) INTO v_revenue_by_method
  FROM (
    SELECT LOWER(COALESCE(payment_method, '')) AS method, price AS amount
    FROM public.appointments
    WHERE user_id::TEXT = v_auth_company_id
      AND status = 'Completed'
      AND appointment_time >= v_start_date
      AND appointment_time <= v_end_date
      AND (p_professional_id IS NULL OR professional_id = p_professional_id)

    UNION ALL

    SELECT LOWER(COALESCE(f.payment_method, '')) AS method, COALESCE(f.revenue, 0) AS amount
    FROM public.finance_records f
    WHERE f.user_id::TEXT = v_auth_company_id
      AND f.type = 'revenue'
      AND f.created_at >= v_start_date
      AND f.created_at <= v_end_date
      AND (p_professional_id IS NULL OR f.professional_id = p_professional_id)
      AND (
        f.appointment_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.product_sales ps
          WHERE ps.finance_record_id = f.id
        )
      )
  ) methods;

  SELECT json_agg(month_data ORDER BY month_start)
  INTO v_chart_data
  FROM (
    SELECT
      month_start,
      json_build_object(
        'month', TO_CHAR(month_start, 'Mon'),
        'revenue', COALESCE(SUM(amount), 0)
      ) AS month_data
    FROM (
      SELECT DATE_TRUNC('month', appointment_time) AS month_start, price AS amount
      FROM public.appointments
      WHERE user_id::TEXT = v_auth_company_id
        AND status = 'Completed'
        AND appointment_time >= NOW() - INTERVAL '6 months'
        AND (p_professional_id IS NULL OR professional_id = p_professional_id)

      UNION ALL

      SELECT DATE_TRUNC('month', f.created_at) AS month_start, COALESCE(f.revenue, 0) AS amount
      FROM public.finance_records f
      WHERE f.user_id::TEXT = v_auth_company_id
        AND f.type = 'revenue'
        AND f.created_at >= NOW() - INTERVAL '6 months'
        AND (p_professional_id IS NULL OR f.professional_id = p_professional_id)
        AND (
          f.appointment_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.product_sales ps
            WHERE ps.finance_record_id = f.id
          )
        )
    ) raw
    GROUP BY month_start
  ) subq;

  SELECT json_agg(row_to_json(tr)) INTO v_transactions
  FROM (
    SELECT * FROM (
      SELECT
        a.id,
        a.appointment_time AS created_at,
        tm.name AS barber_name,
        a.professional_id,
        cl.name AS client_name,
        a.service AS service_name,
        NULL::TEXT AS description,
        a.price AS amount,
        0::DECIMAL AS expense,
        'revenue'::TEXT AS type,
        TRUE AS commission_paid,
        a.payment_method,
        'paid'::TEXT AS status
      FROM public.appointments a
      LEFT JOIN public.team_members tm ON a.professional_id = tm.id
      LEFT JOIN public.clients cl ON a.client_id = cl.id
      WHERE a.user_id::TEXT = v_auth_company_id
        AND a.status = 'Completed'
        AND a.appointment_time >= v_start_date
        AND a.appointment_time <= v_end_date
        AND (p_professional_id IS NULL OR a.professional_id = p_professional_id)

      UNION ALL

      SELECT
        f.id,
        f.created_at,
        f.barber_name,
        f.professional_id,
        f.client_name,
        COALESCE(
          NULLIF(TRIM(f.service_name), ''),
          a_link.service,
          NULLIF(TRIM(f.description), ''),
          'Sem descricao'
        ) AS service_name,
        f.description,
        CASE WHEN f.type = 'revenue' THEN COALESCE(f.revenue, 0) ELSE 0 END AS amount,
        CASE WHEN f.type = 'expense' THEN COALESCE(f.commission_value, 0) ELSE 0 END AS expense,
        f.type,
        COALESCE(f.commission_paid, FALSE) AS commission_paid,
        f.payment_method,
        COALESCE(
          f.status,
          CASE
            WHEN f.type = 'expense' AND (f.commission_paid IS FALSE OR f.commission_paid IS NULL)
            THEN 'pending'
            ELSE 'paid'
          END
        ) AS status
      FROM public.finance_records f
      LEFT JOIN public.appointments a_link ON f.appointment_id = a_link.id
      WHERE f.user_id::TEXT = v_auth_company_id
        AND f.created_at >= v_start_date
        AND f.created_at <= v_end_date
        AND (p_professional_id IS NULL OR f.professional_id = p_professional_id)
        AND (
          f.type <> 'revenue'
          OR f.appointment_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.product_sales ps
            WHERE ps.finance_record_id = f.id
          )
        )
    ) all_trans
    ORDER BY created_at DESC
    LIMIT 100
  ) tr;

  v_result := json_build_object(
    'revenue', v_revenue,
    'expenses', v_expenses,
    'pendingExpenses', v_pending_expenses,
    'commissions_pending', v_commissions_pending,
    'profit', v_profit,
    'revenue_by_method', COALESCE(v_revenue_by_method, '{"pix":0,"mbway":0,"dinheiro":0,"cartao":0}'::json),
    'chart_data', COALESCE(v_chart_data, '[]'::json),
    'transactions', COALESCE(v_transactions, '[]'::json)
  );

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_monthly_finance_history__tenant_unsafe(p_user_id text, p_months_count integer DEFAULT 12)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(row_to_json(t))
  INTO v_result
  FROM (
    SELECT
      TO_CHAR(month_start, 'TMMonth') AS month_name,
      EXTRACT(YEAR FROM month_start)::INTEGER AS year_num,
      EXTRACT(MONTH FROM month_start)::INTEGER AS month_num,
      COALESCE((
        SELECT SUM(price) FROM appointments
        WHERE user_id = p_user_id AND status = 'Completed'
          AND DATE_TRUNC('month', appointment_time) = month_start
      ), 0)
      +
      COALESCE((
        SELECT SUM(COALESCE(revenue, 0)) FROM finance_records
        WHERE user_id = p_user_id AND type = 'revenue' AND appointment_id IS NULL
          AND DATE_TRUNC('month', created_at) = month_start
      ), 0) AS revenue,
      COALESCE((
        SELECT SUM(COALESCE(commission_value, 0)) FROM finance_records
        WHERE user_id = p_user_id AND type = 'expense'
          AND (commission_paid IS TRUE OR status = 'paid')
          AND DATE_TRUNC('month', created_at) = month_start
      ), 0) AS expenses,
      COALESCE((
        SELECT SUM(price) FROM appointments
        WHERE user_id = p_user_id AND status = 'Completed'
          AND DATE_TRUNC('month', appointment_time) = month_start
      ), 0)
      +
      COALESCE((
        SELECT SUM(COALESCE(revenue, 0)) FROM finance_records
        WHERE user_id = p_user_id AND type = 'revenue' AND appointment_id IS NULL
          AND DATE_TRUNC('month', created_at) = month_start
      ), 0)
      -
      COALESCE((
        SELECT SUM(COALESCE(commission_value, 0)) FROM finance_records
        WHERE user_id = p_user_id AND type = 'expense'
          AND (commission_paid IS TRUE OR status = 'paid')
          AND DATE_TRUNC('month', created_at) = month_start
      ), 0) AS profit
    FROM (
      SELECT generate_series(
        DATE_TRUNC('month', NOW()) - ((p_months_count - 1) * INTERVAL '1 month'),
        DATE_TRUNC('month', NOW()),
        INTERVAL '1 month'
      ) AS month_start
    ) months
    ORDER BY month_start
  ) t;
  RETURN COALESCE(v_result, '[]'::json);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats__tenant_unsafe(p_user_id text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_profit              NUMERIC := 0;
  v_current_month_revenue     NUMERIC := 0;
  v_month_scheduled_value     NUMERIC := 0;
  v_weekly_growth             NUMERIC := 0;
  v_monthly_goal              NUMERIC := 5000;
  v_last_week_revenue         NUMERIC := 0;
  v_this_week_revenue         NUMERIC := 0;
  v_recovered_revenue         NUMERIC := 0;
  v_avoided_no_shows          NUMERIC := 0;
  v_filled_slots              NUMERIC := 0;
  v_campaigns_sent            INT     := 0;
  v_appointments_total        INT     := 0;
  v_appointments_this_month   INT     := 0;
  v_completed_this_month      INT     := 0;
  v_has_public_bookings       BOOLEAN := false;
  v_account_days_old          INT     := 0;
  v_data_maturity_score       INT     := 0;
  v_avg_ticket                NUMERIC := 0;
  v_churn_risk_count          INT     := 0;
  v_top_service               TEXT    := '';
  v_repeat_client_rate        NUMERIC := 0;
  v_completed_total           INT     := 0;
  v_clients_with_repeat       INT     := 0;
  v_total_unique_clients      INT     := 0;
  v_created_at                TIMESTAMPTZ;
BEGIN
  SELECT COALESCE(SUM(price), 0)
  INTO v_total_profit
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Completed';

  SELECT COALESCE(SUM(price), 0)
  INTO v_current_month_revenue
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Completed'
    AND DATE_TRUNC('month', appointment_time) = DATE_TRUNC('month', CURRENT_DATE);

  SELECT COALESCE(SUM(price), 0)
  INTO v_month_scheduled_value
  FROM appointments
  WHERE user_id = p_user_id
    AND status IN ('Confirmed', 'Completed')
    AND DATE_TRUNC('month', appointment_time) = DATE_TRUNC('month', CURRENT_DATE);

  SELECT COALESCE(SUM(price), 0) INTO v_last_week_revenue
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Completed'
    AND appointment_time >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 week'
    AND appointment_time < DATE_TRUNC('week', CURRENT_DATE);

  SELECT COALESCE(SUM(price), 0) INTO v_this_week_revenue
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Completed'
    AND appointment_time >= DATE_TRUNC('week', CURRENT_DATE);

  IF v_last_week_revenue > 0 THEN
    v_weekly_growth := ROUND(((v_this_week_revenue - v_last_week_revenue) / v_last_week_revenue) * 100, 1);
  END IF;

  SELECT COALESCE(monthly_goal, 5000) INTO v_monthly_goal
  FROM profiles WHERE id = p_user_id;

  SELECT COUNT(*) INTO v_campaigns_sent
  FROM aios_logs
  WHERE user_id = p_user_id::UUID
    AND action_type = 'execution'
    AND (content->>'type') = 'campaign_sent'
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE);

  SELECT COALESCE(SUM(a.price), 0) INTO v_recovered_revenue
  FROM appointments a
  WHERE a.user_id = p_user_id
    AND a.status = 'Completed'
    AND a.appointment_time >= DATE_TRUNC('month', CURRENT_DATE)
    AND EXISTS (
      SELECT 1 FROM aios_logs l
      WHERE l.user_id = p_user_id::UUID
        AND l.action_type = 'execution'
        AND (l.content->>'type') = 'campaign_sent'
        AND (l.content->>'client_id')::TEXT = a.client_id::TEXT
        AND l.created_at < a.created_at
        AND l.created_at >= (a.created_at - INTERVAL '30 days')
    );

  SELECT COALESCE(SUM(price * 0.5), 0) INTO v_avoided_no_shows
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Confirmed'
    AND appointment_time >= DATE_TRUNC('week', CURRENT_DATE);

  SELECT COALESCE(SUM(price), 0) INTO v_filled_slots
  FROM appointments
  WHERE user_id = p_user_id
    AND status IN ('Confirmed', 'Completed')
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
    AND EXISTS (
      SELECT 1 FROM public_bookings pb
      WHERE pb.business_id = p_user_id
        AND pb.status IN ('confirmed', 'completed')
    );

  SELECT COUNT(*) INTO v_appointments_total
  FROM appointments
  WHERE user_id = p_user_id;

  SELECT COUNT(*) INTO v_appointments_this_month
  FROM appointments
  WHERE user_id = p_user_id
    AND DATE_TRUNC('month', appointment_time) = DATE_TRUNC('month', CURRENT_DATE);

  SELECT COUNT(*) INTO v_completed_this_month
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Completed'
    AND DATE_TRUNC('month', appointment_time) = DATE_TRUNC('month', CURRENT_DATE);

  SELECT EXISTS(
    SELECT 1 FROM public_bookings WHERE business_id = p_user_id LIMIT 1
  ) INTO v_has_public_bookings;

  SELECT created_at INTO v_created_at
  FROM auth.users WHERE id = p_user_id::UUID;
  IF v_created_at IS NOT NULL THEN
    v_account_days_old := EXTRACT(EPOCH FROM (NOW() - v_created_at)) / 86400;
  END IF;

  v_data_maturity_score :=
    CASE WHEN v_appointments_total >= 10 THEN 20 ELSE (v_appointments_total * 2) END +
    CASE WHEN v_appointments_this_month >= 5 THEN 20 ELSE (v_appointments_this_month * 4) END +
    CASE WHEN v_completed_this_month >= 1 THEN 20 ELSE 0 END +
    CASE WHEN v_has_public_bookings THEN 20 ELSE 0 END +
    CASE WHEN v_account_days_old >= 30 THEN 20 ELSE (v_account_days_old::INT) END;

  SELECT COUNT(*) INTO v_completed_total
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Completed'
    AND appointment_time >= (NOW() - INTERVAL '90 days');

  IF v_completed_total > 0 THEN
    SELECT ROUND(COALESCE(SUM(price), 0) / v_completed_total, 2) INTO v_avg_ticket
    FROM appointments
    WHERE user_id = p_user_id
      AND status = 'Completed'
      AND appointment_time >= (NOW() - INTERVAL '90 days');
  END IF;

  SELECT COUNT(DISTINCT c.id) INTO v_churn_risk_count
  FROM clients c
  WHERE c.user_id = p_user_id
    AND c.last_visit IS NOT NULL
    AND c.last_visit < (NOW() - INTERVAL '45 days')
    AND c.last_visit >= (NOW() - INTERVAL '180 days');

  SELECT COALESCE(service, '') INTO v_top_service
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Completed'
    AND appointment_time >= (NOW() - INTERVAL '90 days')
  GROUP BY service
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  SELECT COUNT(DISTINCT client_id) INTO v_total_unique_clients
  FROM appointments
  WHERE user_id = p_user_id
    AND appointment_time >= (NOW() - INTERVAL '90 days');

  SELECT COUNT(DISTINCT client_id) INTO v_clients_with_repeat
  FROM appointments
  WHERE user_id = p_user_id
    AND appointment_time >= (NOW() - INTERVAL '90 days')
  GROUP BY client_id
  HAVING COUNT(*) >= 2;

  IF v_total_unique_clients > 0 THEN
    v_repeat_client_rate := ROUND((v_clients_with_repeat::NUMERIC / v_total_unique_clients) * 100, 1);
  END IF;

  RETURN json_build_object(
    'total_profit',             v_total_profit,
    'current_month_revenue',    v_current_month_revenue,
    'month_scheduled_value',    v_month_scheduled_value,
    'weekly_growth',            v_weekly_growth,
    'monthly_goal',             v_monthly_goal,
    'recovered_revenue',        v_recovered_revenue,
    'avoided_no_shows',         v_avoided_no_shows,
    'filled_slots',             v_filled_slots,
    'campaigns_sent',           v_campaigns_sent,
    'appointments_total',       v_appointments_total,
    'appointments_this_month',  v_appointments_this_month,
    'completed_this_month',     v_completed_this_month,
    'has_public_bookings',      v_has_public_bookings,
    'account_days_old',         v_account_days_old,
    'data_maturity_score',      LEAST(v_data_maturity_score, 100),
    'avg_ticket',               v_avg_ticket,
    'churn_risk_count',         v_churn_risk_count,
    'top_service',              v_top_service,
    'repeat_client_rate',       v_repeat_client_rate
  );
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
 IF auth.uid() IS NULL OR public.get_auth_role() IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 
  SELECT COALESCE(get_auth_company_id()::TEXT, auth.uid()::TEXT)
  INTO v_auth_company_id;

  IF v_auth_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF public.get_auth_role() IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Apenas o dono pode ver as comissões da equipe.'
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

CREATE OR REPLACE FUNCTION public.get_chair_hour_v1(p_month date, p_professional_id uuid DEFAULT NULL::uuid, p_end_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_company text := public.get_auth_company_id(); v_role text := public.get_auth_role();
 v_start date := p_month; v_end date := COALESCE(p_end_date, (date_trunc('month',p_month::timestamp) + interval '1 month - 1 day')::date);
 v_timezone text; v_hours jsonb; v_threshold numeric := 20; v_staff uuid; v_result jsonb;
BEGIN
 IF auth.uid() IS NULL OR v_company IS NULL OR COALESCE(v_role,'') NOT IN ('owner','staff') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 IF v_start IS NULL OR v_end < v_start OR v_end-v_start > 365 THEN RAISE EXCEPTION 'invalid_period' USING ERRCODE='22023'; END IF;
 SELECT COALESCE(bs.timezone, CASE WHEN p.region='PT' THEN 'Europe/Lisbon' ELSE 'America/Sao_Paulo' END), bs.business_hours
 INTO v_timezone,v_hours FROM public.profiles p LEFT JOIN public.business_settings bs ON bs.user_id::text=v_company
 WHERE p.id=v_company LIMIT 1;
 IF v_timezone IS NULL OR NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=v_timezone) THEN v_timezone:='UTC'; END IF;
 SELECT COALESCE((SELECT h.value->>'timezone' FROM chair_hour_private.history h WHERE h.company_id=v_company AND h.kind='business' AND h.effective_at <= v_start::timestamp AT TIME ZONE COALESCE(v_timezone,'UTC') ORDER BY h.effective_at DESC,h.id DESC LIMIT 1),v_timezone) INTO v_timezone;
 SELECT COALESCE((SELECT low_margin_pct FROM public.chair_hour_settings WHERE company_id=v_company),20) INTO v_threshold;
 IF v_timezone IS NULL OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name=v_timezone) THEN v_timezone := 'UTC'; END IF;
 IF EXISTS(SELECT 1 FROM (
  SELECT h.effective_at,h.value->>'timezone' AS tz,lag(h.value->>'timezone') OVER(ORDER BY h.effective_at,h.id) AS previous_tz,lag(h.id) OVER(ORDER BY h.effective_at,h.id) AS previous_id
  FROM chair_hour_private.history h WHERE h.company_id=v_company AND h.kind='business'
 ) x WHERE x.previous_id IS NOT NULL AND x.tz IS DISTINCT FROM x.previous_tz AND x.effective_at > v_start::timestamp AT TIME ZONE v_timezone AND x.effective_at < (v_end+1)::timestamp AT TIME ZONE v_timezone) THEN
  RAISE EXCEPTION 'timezone_changed_in_period_select_smaller_period' USING ERRCODE='22023';
 END IF;
 IF v_role = 'staff' THEN
   SELECT t.id INTO v_staff FROM public.team_members t WHERE t.user_id::text=v_company AND t.staff_user_id=auth.uid() AND t.active AND t.deleted_at IS NULL LIMIT 1;
   IF v_staff IS NULL OR (p_professional_id IS NOT NULL AND p_professional_id<>v_staff) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 ELSIF p_professional_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.team_members t WHERE t.user_id::text=v_company AND t.id=p_professional_id) THEN
   RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501';
 END IF;
 WITH professionals AS (
   SELECT t.id,t.name,t.is_owner
   FROM public.team_members t WHERE t.user_id::text=v_company AND (
     (t.active AND t.deleted_at IS NULL)
     OR EXISTS (SELECT 1 FROM public.appointments a WHERE a.user_id::text=v_company AND a.professional_id=t.id AND a.status='Completed' AND a.appointment_time >= v_start::timestamp AT TIME ZONE v_timezone AND a.appointment_time < (v_end+1)::timestamp AT TIME ZONE v_timezone)
     OR EXISTS (SELECT 1 FROM chair_hour_private.history h WHERE h.company_id=v_company AND h.kind='professional' AND h.entity_id=t.id::text AND (h.value->>'active')::boolean AND h.effective_at < (v_end+1)::timestamp AT TIME ZONE v_timezone AND NOT EXISTS (SELECT 1 FROM chair_hour_private.history n WHERE n.kind=h.kind AND n.entity_id=h.entity_id AND n.company_id=h.company_id AND (n.effective_at,n.id)>(h.effective_at,h.id) AND n.effective_at < v_start::timestamp AT TIME ZONE v_timezone))
   )
 ), dates AS (
   SELECT x::date AS d FROM generate_series(v_start::timestamp,v_end::timestamp,interval '1 day') x
 ), daily AS (
   SELECT p.id,d.d,
     CASE WHEN ph.value->>'active'='true' THEN COALESCE(NULLIF(ph.value->'working_hours','null'::jsonb),NULLIF(bh.value->'business_hours','null'::jsonb)) END AS hours,
     (ph.id IS NULL OR (ph.baseline AND ph.value->>'active' IS DISTINCT FROM 'true')) AS unknown
   FROM professionals p CROSS JOIN dates d
   LEFT JOIN LATERAL (SELECT h.* FROM chair_hour_private.history h WHERE h.company_id=v_company AND h.kind='professional' AND h.entity_id=p.id::text AND h.effective_at <= d.d::timestamp AT TIME ZONE v_timezone ORDER BY h.effective_at DESC,h.id DESC LIMIT 1) ph ON true
   LEFT JOIN LATERAL (SELECT h.* FROM chair_hour_private.history h WHERE h.company_id=v_company AND h.kind='business' AND h.entity_id=v_company AND h.effective_at <= d.d::timestamp AT TIME ZONE v_timezone ORDER BY h.effective_at DESC,h.id DESC LIMIT 1) bh ON true
 ), hours_expanded AS (
   SELECT p.id,
     ((p.d + (b->>'start')::time) AT TIME ZONE v_timezone) AS starts,
     ((p.d + (b->>'end')::time) AT TIME ZONE v_timezone) AS ends
   FROM daily p
   CROSS JOIN LATERAL (SELECT p.hours->(ARRAY['sun','mon','tue','wed','thu','fri','sat'])[extract(dow FROM p.d)::int+1] AS day) h
   CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(h.day->'blocks')='array' THEN h.day->'blocks' ELSE '[]'::jsonb END) b
   WHERE h.day->>'isOpen'='true' AND b->>'start' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
     AND b->>'end' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND b->>'end' > b->>'start'
 ), open_hours AS (
   SELECT id,range_agg(tstzrange(starts,ends,'[)')) AS ranges FROM hours_expanded WHERE ends>starts GROUP BY id
 ), blocked AS (
   SELECT b.professional_id,range_agg(tstzrange(b.starts_at,b.ends_at,'[)')) AS ranges
   FROM public.agenda_blocks b JOIN professionals p ON p.id=b.professional_id
   WHERE b.user_id::text=v_company AND b.ends_at>b.starts_at
     AND b.starts_at < (v_end+1)::timestamp AT TIME ZONE v_timezone
     AND b.ends_at > v_start::timestamp AT TIME ZONE v_timezone GROUP BY b.professional_id
 ), available AS (
   SELECT p.id, CASE WHEN EXISTS (SELECT 1 FROM daily x WHERE x.id=p.id AND (x.unknown OR x.hours IS NULL AND NOT EXISTS (SELECT 1 FROM chair_hour_private.history h WHERE h.company_id=v_company AND h.kind='professional' AND h.entity_id=p.id::text AND h.value->>'active'='false' AND NOT h.baseline AND h.effective_at <= x.d::timestamp AT TIME ZONE v_timezone))) THEN NULL ELSE COALESCE(sum(extract(epoch FROM (upper(x.r)-lower(x.r)))/60),0) END AS minutes
   FROM professionals p LEFT JOIN open_hours oh ON oh.id=p.id LEFT JOIN blocked b ON b.professional_id=p.id
   LEFT JOIN LATERAL unnest(COALESCE(oh.ranges,'{}'::tstzmultirange) - COALESCE(b.ranges,'{}'::tstzmultirange)) x(r) ON true
   GROUP BY p.id
 ), costs AS (
   SELECT c.professional_id,sum(c.amount * x.days / x.month_days) AS amount
   FROM public.fixed_costs c CROSS JOIN LATERAL (
      SELECT count(*)::numeric AS days, extract(day FROM (date_trunc('month',d.d)+interval '1 month - 1 day'))::numeric AS month_days
      FROM dates d WHERE d.d>=c.start_date AND (c.end_date IS NULL OR d.d<=c.end_date)
      GROUP BY date_trunc('month',d.d)
   ) x WHERE c.company_id=v_company AND c.active GROUP BY c.professional_id
 ), cost_summary AS (SELECT count(*) AS configured FROM public.fixed_costs WHERE company_id=v_company AND active AND start_date<=v_end AND (end_date IS NULL OR end_date>=v_start)),
 shared AS (SELECT COALESCE(sum(amount),0) AS amount FROM costs WHERE professional_id IS NULL),
 attendance AS (
   SELECT a.id,a.professional_id,a.service,a.appointment_time,COALESCE(a.actual_duration_minutes,a.duration_minutes) AS minutes,
     (a.actual_duration_minutes IS NULL) AS estimated, CASE WHEN a.price>=0 THEN a.price END AS revenue,
     CASE WHEN p.is_owner THEN 0 ELSE fr.commission_value END AS commission, COALESCE(a.machine_fee_amount,0) AS machine_fee
   FROM public.appointments a JOIN professionals p ON p.id=a.professional_id
   LEFT JOIN LATERAL (SELECT CASE WHEN count(*)=1 THEN max(f.revenue) END AS revenue,
       CASE WHEN count(*)=1 THEN max(f.commission_value) END AS commission_value FROM public.finance_records f
     WHERE f.user_id::text=v_company AND f.appointment_id=a.id
       AND f.type='revenue'
       AND NOT EXISTS (SELECT 1 FROM public.product_sales ps WHERE ps.finance_record_id=f.id)
     ) fr ON true
   WHERE a.user_id::text=v_company AND a.status='Completed'
     AND a.appointment_time >= v_start::timestamp AT TIME ZONE v_timezone
     AND a.appointment_time < (v_end+1)::timestamp AT TIME ZONE v_timezone
 ), service_match AS (
   SELECT a.*,s.id AS service_id,(sc.value->>'amount')::numeric AS material FROM attendance a
   LEFT JOIN LATERAL (SELECT min(s.id::text)::uuid AS id FROM public.services s WHERE s.user_id::text=v_company AND lower(trim(s.name))=lower(trim(a.service)) HAVING count(*)=1) s ON true
   LEFT JOIN LATERAL (SELECT h.value FROM chair_hour_private.history h WHERE h.company_id=v_company AND h.kind='material' AND h.entity_id=s.id::text AND h.effective_at<=a.appointment_time ORDER BY h.effective_at DESC,h.id DESC LIMIT 1) sc ON true
 ), agg AS (
   SELECT p.id,p.name,av.minutes AS available_minutes,
     COALESCE(sum(a.minutes) FILTER (WHERE a.minutes>0),0) AS worked_minutes,
     count(*) FILTER (WHERE a.id IS NOT NULL) AS attendance_count,
     count(*) FILTER (WHERE a.id IS NOT NULL AND (a.minutes IS NULL OR a.minutes<=0)) AS unknown_duration_count,
     count(*) FILTER (WHERE a.id IS NOT NULL AND a.revenue IS NULL) AS unknown_revenue_count,
     count(*) FILTER (WHERE a.id IS NOT NULL AND a.commission IS NULL) AS unknown_commission_count,
     count(*) FILTER (WHERE a.id IS NOT NULL AND a.estimated) AS estimated_count,
     COALESCE(sum(a.revenue),0) AS revenue,COALESCE(sum(a.commission),0) AS commission,COALESCE(sum(a.machine_fee),0) AS machine_fee,
     CASE WHEN count(*) FILTER (WHERE a.id IS NOT NULL AND a.material IS NULL)>0 THEN NULL ELSE COALESCE(sum(a.material),0) END AS material_cost
   FROM professionals p JOIN available av ON av.id=p.id LEFT JOIN service_match a ON a.professional_id=p.id
   GROUP BY p.id,p.name,av.minutes
 ), metrics AS (
   SELECT a.*, CASE WHEN (SELECT configured FROM cost_summary)=0 OR (SELECT amount FROM shared)>0 AND bool_or(a.available_minutes IS NULL) OVER () THEN NULL ELSE COALESCE(c.amount,0) +
     CASE WHEN sum(a.available_minutes) OVER ()>0 THEN (SELECT amount FROM shared)*a.available_minutes/sum(a.available_minutes) OVER () ELSE 0 END END AS fixed_cost
   FROM agg a LEFT JOIN costs c ON c.professional_id=a.id
 ), final AS (
   SELECT m.*,CASE WHEN m.unknown_duration_count=0 AND m.unknown_revenue_count=0 THEN m.revenue/NULLIF(m.worked_minutes/60.0,0) END AS revenue_per_worked_hour,
     CASE WHEN m.unknown_revenue_count=0 THEN m.revenue/NULLIF(m.available_minutes/60,0) END AS revenue_per_available_hour,
     CASE WHEN m.unknown_duration_count=0 THEN m.worked_minutes/NULLIF(m.available_minutes,0) END AS occupancy,
     CASE WHEN m.unknown_duration_count=0 AND m.unknown_commission_count=0 THEN m.fixed_cost/NULLIF(m.available_minutes/60,0) + CASE WHEN m.attendance_count=0 THEN 0 ELSE (m.material_cost+m.commission+m.machine_fee)/NULLIF(m.available_minutes/60.0,0) END END AS cost_per_hour,
     CASE WHEN m.unknown_duration_count=0 THEN m.fixed_cost/NULLIF(m.available_minutes/60,0)*GREATEST(m.available_minutes-m.worked_minutes,0)/60 END AS idle_cost
   FROM metrics m
 ), data AS (
   SELECT f.*, f.revenue_per_available_hour-f.cost_per_hour AS margin_per_hour FROM final f
 ), service_results AS (
   SELECT s.service_id,min(s.service) AS name,
     CASE WHEN bool_or(s.material IS NULL OR s.revenue IS NULL OR s.commission IS NULL OR d.fixed_cost IS NULL OR d.available_minutes IS NULL OR d.available_minutes=0 OR s.minutes IS NULL OR s.minutes<=0) THEN NULL
       WHEN sum(s.revenue - s.commission - s.machine_fee - s.material - s.minutes/60.0*d.fixed_cost/NULLIF(d.available_minutes/60,0)) < 0 THEN 'loss'
       WHEN sum(s.revenue)>0 AND 100*sum(s.revenue-s.commission-s.machine_fee-s.material-s.minutes/60.0*d.fixed_cost/NULLIF(d.available_minutes/60,0))/sum(s.revenue)<=v_threshold THEN 'low'
       ELSE NULL END AS status
   FROM service_match s JOIN data d ON d.id=s.professional_id
   WHERE s.service_id IS NOT NULL AND (p_professional_id IS NULL OR s.professional_id=p_professional_id)
   GROUP BY s.service_id
 ), totals AS (
   SELECT CASE WHEN bool_or(d.available_minutes IS NULL) THEN NULL ELSE sum(d.available_minutes) END AS available_minutes,
     sum(d.worked_minutes) AS worked_minutes,sum(d.estimated_count) AS estimated_count,sum(d.revenue) AS revenue,
     sum(d.attendance_count) AS attendance_count, sum(d.unknown_duration_count) AS unknown_duration_count, sum(d.unknown_revenue_count) AS unknown_revenue_count, sum(d.unknown_commission_count) AS unknown_commission_count,
     CASE WHEN bool_or(d.idle_cost IS NULL) THEN NULL ELSE sum(d.idle_cost) END AS idle_cost,
     sum(d.commission) AS commission,sum(d.machine_fee) AS machine_fee,CASE WHEN bool_or(d.material_cost IS NULL) THEN NULL ELSE sum(d.material_cost) END AS material_cost,
     CASE WHEN bool_or(d.fixed_cost IS NULL) THEN NULL ELSE sum(d.fixed_cost) END AS fixed_cost
   FROM data d WHERE p_professional_id IS NULL OR d.id=p_professional_id
 ), total_values AS (
   SELECT t.*,CASE WHEN t.unknown_duration_count=0 AND t.unknown_revenue_count=0 THEN t.revenue/NULLIF(t.worked_minutes/60.0,0) END AS revenue_per_worked_hour,
     CASE WHEN t.unknown_revenue_count=0 THEN t.revenue/NULLIF(t.available_minutes/60,0) END AS revenue_per_available_hour,
     CASE WHEN t.unknown_duration_count=0 THEN t.worked_minutes/NULLIF(t.available_minutes,0) END AS occupancy,
     CASE WHEN t.unknown_duration_count=0 AND t.unknown_commission_count=0 THEN t.fixed_cost/NULLIF(t.available_minutes/60,0)+CASE WHEN t.attendance_count=0 THEN 0 ELSE (t.material_cost+t.commission+t.machine_fee)/NULLIF(t.available_minutes/60.0,0) END END AS cost_per_hour
   FROM totals t
 )
 SELECT jsonb_build_object('month',v_start,'end_date',v_end,'role',v_role,'history_estimated',EXISTS(SELECT 1 FROM chair_hour_private.history h WHERE h.company_id=v_company AND h.baseline AND v_start < (h.recorded_at AT TIME ZONE v_timezone)::date),
   'professionals', COALESCE((SELECT jsonb_agg(CASE WHEN v_role='staff' THEN jsonb_build_object(
      'id',d.id,'name',d.name,'available_minutes',d.available_minutes,'worked_minutes',d.worked_minutes,'estimated_count',d.estimated_count,
      'revenue_per_worked_hour',d.revenue_per_worked_hour,'revenue_per_available_hour',d.revenue_per_available_hour,'occupancy',d.occupancy)
      ELSE to_jsonb(d) END ORDER BY d.name) FROM data d WHERE (v_role='staff' AND d.id=v_staff) OR (v_role='owner' AND (p_professional_id IS NULL OR d.id=p_professional_id))),'[]'::jsonb))
   || CASE WHEN v_role='owner' THEN jsonb_build_object('total',(SELECT to_jsonb(t) || jsonb_build_object('margin_per_hour',t.revenue_per_available_hour-t.cost_per_hour) FROM total_values t),
       'services',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',s.name,'status',s.status) ORDER BY s.name) FROM service_results s WHERE s.status IS NOT NULL),'[]'::jsonb),
       'unassigned_attendance_count',(SELECT count(*) FROM public.appointments a WHERE a.user_id::text=v_company AND a.status='Completed' AND a.appointment_time >= v_start::timestamp AT TIME ZONE v_timezone AND a.appointment_time < (v_end+1)::timestamp AT TIME ZONE v_timezone AND NOT EXISTS(SELECT 1 FROM professionals p WHERE p.id=a.professional_id)),
       'services_pending_count',(SELECT count(*) FROM service_match s JOIN data d ON d.id=s.professional_id WHERE (p_professional_id IS NULL OR s.professional_id=p_professional_id) AND (s.service_id IS NULL OR s.material IS NULL OR s.minutes IS NULL OR s.minutes<=0 OR s.revenue IS NULL OR s.commission IS NULL OR d.fixed_cost IS NULL OR d.available_minutes IS NULL OR d.available_minutes=0))) ELSE '{}'::jsonb END
 INTO v_result;
 RETURN v_result;
END $function$;

COMMIT;
