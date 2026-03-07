-- =======================================================================
-- CORREÇÃO DEFINITIVA v3 — Módulo Financeiro
-- Data: 2026-03-01
-- Problema: múltiplas versões de get_finance_stats com assinaturas
-- diferentes (UUID, TEXT, TIMESTAMP) coexistindo e causando chamada
-- da versão errada, que não retorna pendingExpenses nem commissions_pending.
-- =======================================================================

-- -----------------------------------------------------------------------
-- PASSO 1: Remove TODAS as versões existentes (todas as assinaturas)
-- -----------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_finance_stats(uuid, timestamp without time zone, timestamp without time zone);
DROP FUNCTION IF EXISTS public.get_finance_stats(uuid, text, text);
DROP FUNCTION IF EXISTS public.get_finance_stats(text, text, text);
DROP FUNCTION IF EXISTS public.get_finance_stats(text, timestamp without time zone, timestamp without time zone);
DROP FUNCTION IF EXISTS get_finance_stats(uuid, timestamp without time zone, timestamp without time zone);
DROP FUNCTION IF EXISTS get_finance_stats(uuid, text, text);
DROP FUNCTION IF EXISTS get_finance_stats(text, text, text);
DROP FUNCTION IF EXISTS get_finance_stats(text, timestamp without time zone, timestamp without time zone);

-- -----------------------------------------------------------------------
-- PASSO 2: Garante que colunas necessárias existam na tabela finance_records
-- -----------------------------------------------------------------------
ALTER TABLE finance_records ADD COLUMN IF NOT EXISTS description  TEXT;
ALTER TABLE finance_records ADD COLUMN IF NOT EXISTS type         TEXT DEFAULT 'expense';
ALTER TABLE finance_records ADD COLUMN IF NOT EXISTS category     TEXT;
ALTER TABLE finance_records ADD COLUMN IF NOT EXISTS client_name  TEXT;
ALTER TABLE finance_records ADD COLUMN IF NOT EXISTS service_name TEXT;
ALTER TABLE finance_records ADD COLUMN IF NOT EXISTS status       TEXT DEFAULT 'paid';
ALTER TABLE finance_records ADD COLUMN IF NOT EXISTS due_date     TIMESTAMP;
ALTER TABLE finance_records ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- -----------------------------------------------------------------------
-- PASSO 3: Versão ÚNICA e CANÔNICA — assinatura (TEXT, TEXT, TEXT)
-- Compatível 100% com Finance.tsx que chama:
--   supabase.rpc('get_finance_stats', { p_user_id, p_start_date, p_end_date })
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_finance_stats(
  p_user_id   TEXT,
  p_start_date TEXT DEFAULT NULL,
  p_end_date   TEXT DEFAULT NULL
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
BEGIN
  -- -----------------------------------------------------------------------
  -- Intervalo de datas (inclui o dia inteiro do dia final)
  -- -----------------------------------------------------------------------
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

  -- -----------------------------------------------------------------------
  -- RECEITA TOTAL
  --   1. Agendamentos concluídos (status = 'Completed')
  --   2. Entradas manuais do tipo 'revenue' sem appointment_id
  -- -----------------------------------------------------------------------
  SELECT COALESCE(SUM(amount), 0) INTO v_revenue
  FROM (
    SELECT price AS amount
    FROM appointments
    WHERE user_id = p_user_id
      AND status = 'Completed'
      AND appointment_time >= v_start_date
      AND appointment_time <= v_end_date

    UNION ALL

    SELECT COALESCE(revenue, 0) AS amount
    FROM finance_records
    WHERE user_id = p_user_id
      AND type = 'revenue'
      AND appointment_id IS NULL
      AND created_at >= v_start_date
      AND created_at <= v_end_date
  ) r;

  -- -----------------------------------------------------------------------
  -- DESPESAS PAGAS (saída de caixa efetiva)
  --   Considera: commission_paid = true OU status = 'paid'
  -- -----------------------------------------------------------------------
  SELECT COALESCE(SUM(COALESCE(commission_value, 0)), 0) INTO v_expenses
  FROM finance_records
  WHERE user_id = p_user_id
    AND type = 'expense'
    AND (commission_paid IS TRUE OR status = 'paid')
    AND created_at >= v_start_date
    AND created_at <= v_end_date;

  -- -----------------------------------------------------------------------
  -- DESPESAS PENDENTES (A Pagar — ainda não saíram do caixa)
  --   Considera: commission_paid IS NOT TRUE E status != 'paid'
  -- -----------------------------------------------------------------------
  SELECT COALESCE(SUM(COALESCE(commission_value, 0)), 0) INTO v_pending_expenses
  FROM finance_records
  WHERE user_id = p_user_id
    AND type = 'expense'
    AND (commission_paid IS FALSE OR commission_paid IS NULL)
    AND (status IS NULL OR status <> 'paid')
    AND created_at >= v_start_date
    AND created_at <= v_end_date;

  -- -----------------------------------------------------------------------
  -- COMISSÕES PENDENTES (a pagar aos profissionais)
  --   Registros de receita gerados automaticamente com comissão não paga
  -- -----------------------------------------------------------------------
  SELECT COALESCE(SUM(COALESCE(commission_value, 0)), 0) INTO v_commissions_pending
  FROM finance_records
  WHERE user_id = p_user_id
    AND type = 'revenue'
    AND commission_paid IS FALSE
    AND COALESCE(commission_value, 0) > 0
    AND created_at >= v_start_date
    AND created_at <= v_end_date;

  -- -----------------------------------------------------------------------
  -- LUCRO LÍQUIDO = receita - despesas pagas
  -- -----------------------------------------------------------------------
  v_profit := v_revenue - v_expenses;

  -- -----------------------------------------------------------------------
  -- DADOS DO GRÁFICO (agrupamento diário)
  -- -----------------------------------------------------------------------
  SELECT json_agg(row_to_json(t) ORDER BY (row_to_json(t)->>'name')) INTO v_chart_data
  FROM (
    SELECT
      TO_CHAR(date, 'DD/MM') AS name,
      COALESCE(SUM(CASE WHEN tipo = 'revenue' THEN val ELSE 0 END), 0) AS receita,
      COALESCE(SUM(CASE WHEN tipo = 'expense' THEN val ELSE 0 END), 0) AS despesas
    FROM (
      -- Agendamentos concluídos → receita
      SELECT DATE(appointment_time) AS date, 'revenue' AS tipo, price AS val
      FROM appointments
      WHERE user_id = p_user_id
        AND status = 'Completed'
        AND appointment_time >= v_start_date
        AND appointment_time <= v_end_date

      UNION ALL

      -- Entradas manuais → receita
      SELECT DATE(created_at) AS date, 'revenue' AS tipo, COALESCE(revenue, 0) AS val
      FROM finance_records
      WHERE user_id = p_user_id
        AND type = 'revenue'
        AND appointment_id IS NULL
        AND created_at >= v_start_date
        AND created_at <= v_end_date

      UNION ALL

      -- Despesas (todas, pagas e pendentes) → impacto no fluxo de caixa
      SELECT DATE(created_at) AS date, 'expense' AS tipo, COALESCE(commission_value, 0) AS val
      FROM finance_records
      WHERE user_id = p_user_id
        AND type = 'expense'
        AND created_at >= v_start_date
        AND created_at <= v_end_date
    ) c
    GROUP BY date
    ORDER BY date
  ) t;

  -- -----------------------------------------------------------------------
  -- RECEITA POR MÉTODO DE PAGAMENTO
  -- -----------------------------------------------------------------------
  SELECT json_build_object(
    'pix',      COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_method,'')) = 'pix' THEN price ELSE 0 END), 0),
    'dinheiro', COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_method,'')) IN ('dinheiro','cash') THEN price ELSE 0 END), 0),
    'cartao',   COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_method,'')) LIKE '%cart%'
                                    OR LOWER(COALESCE(payment_method,'')) LIKE '%card%' THEN price ELSE 0 END), 0)
  ) INTO v_revenue_by_method
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Completed'
    AND appointment_time >= v_start_date
    AND appointment_time <= v_end_date;

  -- -----------------------------------------------------------------------
  -- TRANSAÇÕES RECENTES (últimas 100)
  -- Fontes:
  --   A) Agendamentos concluídos (receita automática)
  --   B) Finance records: despesas + entradas manuais
  --      (exclui finance_records de receita automática para não duplicar)
  -- -----------------------------------------------------------------------
  SELECT json_agg(row_to_json(tr)) INTO v_transactions
  FROM (
    SELECT * FROM (

      -- (A) Agendamentos concluídos → receita automática
      SELECT
        a.id,
        a.appointment_time                AS created_at,
        tm.name                           AS barber_name,
        cl.name                           AS client_name,
        a.service                         AS service_name,
        NULL::TEXT                        AS description,
        a.price                           AS amount,
        0::DECIMAL                        AS expense,
        'revenue'::TEXT                   AS type,
        TRUE                              AS commission_paid,
        a.payment_method,
        'paid'::TEXT                      AS status
      FROM appointments a
      LEFT JOIN team_members tm ON a.professional_id = tm.id
      LEFT JOIN clients cl      ON a.client_id = cl.id
      WHERE a.user_id = p_user_id
        AND a.status = 'Completed'
        AND a.appointment_time >= v_start_date
        AND a.appointment_time <= v_end_date

      UNION ALL

      -- (B) Finance records manuais (despesas e receitas manuais)
      SELECT
        f.id,
        f.created_at,
        f.barber_name,
        f.client_name,
        COALESCE(
          NULLIF(TRIM(f.service_name), ''),
          a_link.service,
          NULLIF(TRIM(f.description), ''),
          'Sem descrição'
        )                                 AS service_name,
        f.description,
        CASE WHEN f.type = 'revenue' THEN COALESCE(f.revenue, 0) ELSE 0 END          AS amount,
        CASE WHEN f.type = 'expense' THEN COALESCE(f.commission_value, 0) ELSE 0 END AS expense,
        f.type,
        COALESCE(f.commission_paid, FALSE)                                             AS commission_paid,
        f.payment_method,
        COALESCE(
          f.status,
          CASE
            WHEN f.type = 'expense' AND (f.commission_paid IS FALSE OR f.commission_paid IS NULL)
            THEN 'pending'
            ELSE 'paid'
          END
        )                                 AS status
      FROM finance_records f
      LEFT JOIN appointments a_link ON f.appointment_id = a_link.id
      WHERE f.user_id = p_user_id
        -- Exclui registros de receita automática (já aparecem via appointments acima)
        AND NOT (f.type = 'revenue' AND f.appointment_id IS NOT NULL)
        AND f.created_at >= v_start_date
        AND f.created_at <= v_end_date

    ) all_trans
    ORDER BY created_at DESC
    LIMIT 100
  ) tr;

  -- -----------------------------------------------------------------------
  -- RESULTADO FINAL
  -- -----------------------------------------------------------------------
  v_result := json_build_object(
    'revenue',             v_revenue,
    'expenses',            v_expenses,
    'pendingExpenses',     v_pending_expenses,
    'commissions_pending', v_commissions_pending,
    'profit',              v_profit,
    'revenue_by_method',   COALESCE(v_revenue_by_method, '{"pix":0,"dinheiro":0,"cartao":0}'::json),
    'chart_data',          COALESCE(v_chart_data, '[]'::json),
    'transactions',        COALESCE(v_transactions, '[]'::json)
  );

  RETURN v_result;
END;
$$;

-- Permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_finance_stats(TEXT, TEXT, TEXT) TO authenticated;

-- Índices de performance (idempotentes)
CREATE INDEX IF NOT EXISTS idx_appointments_user_time_status
  ON appointments(user_id, appointment_time, status);

CREATE INDEX IF NOT EXISTS idx_finance_records_user_created
  ON finance_records(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_finance_records_type_status
  ON finance_records(user_id, type, status, commission_paid);
