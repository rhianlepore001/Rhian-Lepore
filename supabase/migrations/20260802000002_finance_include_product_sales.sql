-- Produtos no Financeiro: incluir vendas vinculadas a agendamento.
-- Antes, get_finance_stats ignorava finance_records com appointment_id
-- (para nao duplicar o preco do servico). Vendas de produto caíam nesse filtro.

-- ---------------------------------------------------------------------------
-- 1. sell_product: payment_method + client_name no finance_records
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.sell_product(UUID, INTEGER, UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION public.sell_product(
  p_product_id UUID,
  p_quantity INTEGER,
  p_appointment_id UUID DEFAULT NULL,
  p_client_id UUID DEFAULT NULL,
  p_professional_id UUID DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL
)
RETURNS public.product_sales AS $$
DECLARE
  v_company_id TEXT;
  v_product public.products%ROWTYPE;
  v_finance_record_id UUID;
  v_sale public.product_sales%ROWTYPE;
  v_total_revenue DECIMAL(10,2);
  v_total_cost DECIMAL(10,2);
  v_commission_percent DECIMAL(5,2);
  v_commission_value DECIMAL(10,2);
  v_professional_name TEXT;
  v_professional_id UUID;
  v_client_name TEXT;
  v_payment_method TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'invalid_quantity';
  END IF;

  SELECT COALESCE(get_auth_company_id(), auth.uid()::TEXT) INTO v_company_id;

  SELECT * INTO v_product
  FROM public.products
  WHERE id = p_product_id
    AND company_id::TEXT = v_company_id
    AND is_active = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'product_not_found';
  END IF;

  IF v_product.stock_quantity < p_quantity THEN
    RAISE EXCEPTION 'insufficient_stock';
  END IF;

  IF p_appointment_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.appointments
    WHERE id = p_appointment_id
      AND user_id::TEXT = v_company_id
  ) THEN
    RAISE EXCEPTION 'appointment_not_found';
  END IF;

  IF p_client_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.clients
    WHERE id = p_client_id
      AND user_id::TEXT = v_company_id
  ) THEN
    RAISE EXCEPTION 'client_not_found';
  END IF;

  v_professional_id := p_professional_id;

  IF v_professional_id IS NULL AND p_appointment_id IS NOT NULL THEN
    SELECT professional_id INTO v_professional_id
    FROM public.appointments
    WHERE id = p_appointment_id;
  END IF;

  IF v_professional_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE id = v_professional_id
      AND user_id::TEXT = v_company_id
  ) THEN
    RAISE EXCEPTION 'professional_not_found';
  END IF;

  v_total_revenue := v_product.sale_price * p_quantity;
  v_total_cost := v_product.cost_price * p_quantity;
  v_commission_percent := COALESCE(v_product.commission_percent, 0);
  v_commission_value := 0;
  IF v_commission_percent > 0 THEN
    v_commission_value := (v_total_revenue * v_commission_percent) / 100;
  END IF;

  IF v_professional_id IS NOT NULL THEN
    SELECT name INTO v_professional_name
    FROM public.team_members
    WHERE id = v_professional_id;
  END IF;
  IF v_professional_name IS NULL THEN
    SELECT full_name INTO v_professional_name
    FROM public.profiles
    WHERE id = auth.uid()::TEXT;
  END IF;
  v_professional_name := COALESCE(v_professional_name, 'Venda de Produto');

  v_client_name := NULL;
  IF p_client_id IS NOT NULL THEN
    SELECT name INTO v_client_name FROM public.clients WHERE id = p_client_id;
  ELSIF p_appointment_id IS NOT NULL THEN
    SELECT c.name INTO v_client_name
    FROM public.appointments a
    JOIN public.clients c ON c.id = a.client_id
    WHERE a.id = p_appointment_id;
  END IF;

  v_payment_method := NULLIF(TRIM(COALESCE(p_payment_method, '')), '');
  IF v_payment_method IS NULL AND p_appointment_id IS NOT NULL THEN
    SELECT payment_method INTO v_payment_method
    FROM public.appointments
    WHERE id = p_appointment_id;
  END IF;

  UPDATE public.products
  SET
    stock_quantity = stock_quantity - p_quantity,
    updated_at = NOW()
  WHERE id = p_product_id
    AND company_id::TEXT = v_company_id;

  INSERT INTO public.finance_records (
    barber_name,
    user_id,
    appointment_id,
    professional_id,
    revenue,
    type,
    description,
    service_name,
    client_name,
    payment_method,
    commission_rate,
    commission_value,
    commission_paid,
    created_at
  ) VALUES (
    v_professional_name,
    v_company_id,
    p_appointment_id,
    v_professional_id,
    v_total_revenue,
    'revenue',
    'Venda de produto: ' || v_product.name,
    v_product.name,
    v_client_name,
    v_payment_method,
    v_commission_percent,
    v_commission_value,
    FALSE,
    NOW()
  )
  RETURNING id INTO v_finance_record_id;

  INSERT INTO public.product_sales (
    company_id,
    product_id,
    appointment_id,
    finance_record_id,
    sold_by,
    professional_id,
    client_id,
    quantity,
    unit_sale_price,
    unit_cost_price,
    total_revenue,
    total_cost,
    commission_percent,
    commission_value
  ) VALUES (
    v_company_id::UUID,
    p_product_id,
    p_appointment_id,
    v_finance_record_id,
    auth.uid(),
    v_professional_id,
    p_client_id,
    p_quantity,
    v_product.sale_price,
    v_product.cost_price,
    v_total_revenue,
    v_total_cost,
    v_commission_percent,
    v_commission_value
  )
  RETURNING * INTO v_sale;

  IF p_appointment_id IS NOT NULL THEN
    DELETE FROM public.appointment_product_lines
    WHERE appointment_id = p_appointment_id
      AND product_id = p_product_id
      AND company_id::TEXT = v_company_id;
  END IF;

  RETURN v_sale;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.sell_product(UUID, INTEGER, UUID, UUID, UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. get_finance_stats: somar e listar vendas de produto (mesmo com appointment_id)
-- ---------------------------------------------------------------------------
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
$$;

GRANT EXECUTE ON FUNCTION public.get_finance_stats(TEXT, TEXT, TEXT, UUID) TO authenticated;
