-- Fase 5: Financeiro com filtro seguro por professional_id para staff.
-- Mantem assinatura compativel adicionando p_professional_id opcional no final.

CREATE OR REPLACE FUNCTION public.get_finance_stats(
  p_user_id TEXT,
  p_start_date TEXT DEFAULT NULL,
  p_end_date TEXT DEFAULT NULL,
  p_professional_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

    SELECT COALESCE(revenue, 0) AS amount
    FROM public.finance_records
    WHERE user_id::TEXT = v_auth_company_id
      AND type = 'revenue'
      AND appointment_id IS NULL
      AND created_at >= v_start_date
      AND created_at <= v_end_date
      AND (p_professional_id IS NULL OR professional_id = p_professional_id)
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
    'pix', COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_method,'')) = 'pix' THEN price ELSE 0 END), 0),
    'mbway', COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_method,'')) = 'mbway' THEN price ELSE 0 END), 0),
    'dinheiro', COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_method,'')) IN ('dinheiro','cash') THEN price ELSE 0 END), 0),
    'cartao', COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_method,'')) LIKE '%cart%'
                                  OR LOWER(COALESCE(payment_method,'')) LIKE '%card%' THEN price ELSE 0 END), 0)
  ) INTO v_revenue_by_method
  FROM public.appointments
  WHERE user_id::TEXT = v_auth_company_id
    AND status = 'Completed'
    AND appointment_time >= v_start_date
    AND appointment_time <= v_end_date
    AND (p_professional_id IS NULL OR professional_id = p_professional_id);

  SELECT json_agg(month_data ORDER BY month_start)
  INTO v_chart_data
  FROM (
    SELECT
      DATE_TRUNC('month', appointment_time) AS month_start,
      json_build_object(
        'month', TO_CHAR(DATE_TRUNC('month', appointment_time), 'Mon'),
        'revenue', COALESCE(SUM(price), 0)
      ) AS month_data
    FROM public.appointments
    WHERE user_id::TEXT = v_auth_company_id
      AND status = 'Completed'
      AND appointment_time >= NOW() - INTERVAL '6 months'
      AND (p_professional_id IS NULL OR professional_id = p_professional_id)
    GROUP BY DATE_TRUNC('month', appointment_time)
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
        AND NOT (f.type = 'revenue' AND f.appointment_id IS NOT NULL)
        AND f.created_at >= v_start_date
        AND f.created_at <= v_end_date
        AND (p_professional_id IS NULL OR f.professional_id = p_professional_id)
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
$$;

GRANT EXECUTE ON FUNCTION public.get_finance_stats(TEXT, TEXT, TEXT, UUID) TO authenticated;
