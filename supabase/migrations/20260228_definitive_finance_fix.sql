-- =======================================================================
-- CORREÇÃO DEFINITIVA: Módulo Financeiro
-- Data: 2026-02-28
-- =======================================================================
-- Problema central: múltiplas versões de get_finance_stats com assinaturas
-- diferentes coexistindo no banco, causando resolução ambígua pelo Postgres.
--
-- Bugs corrigidos:
-- 1. Despesa manual some no gráfico mas não aparece em transações recentes
-- 2. Entrada manual não soma na receita e não aparece em transações recentes
-- 3. Transações antigas exibem "Serviço" sem identificação real
-- =======================================================================

-- PASSO 1: Remove TODAS as versões existentes do RPC para eliminar conflito
-- Cada assinatura que já existiu em alguma migração é dropada explicitamente
DROP FUNCTION IF EXISTS public.get_finance_stats(uuid, timestamp without time zone, timestamp without time zone);
DROP FUNCTION IF EXISTS public.get_finance_stats(uuid, text, text);
DROP FUNCTION IF EXISTS public.get_finance_stats(text, text, text);
DROP FUNCTION IF EXISTS public.get_finance_stats(text, timestamp without time zone, timestamp without time zone);
DROP FUNCTION IF EXISTS get_finance_stats(uuid, timestamp without time zone, timestamp without time zone);
DROP FUNCTION IF EXISTS get_finance_stats(uuid, text, text);
DROP FUNCTION IF EXISTS get_finance_stats(text, text, text);
DROP FUNCTION IF EXISTS get_finance_stats(text, timestamp without time zone, timestamp without time zone);

-- PASSO 2: Garante que colunas necessárias existam na tabela finance_records
ALTER TABLE finance_records ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE finance_records ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'expense';
ALTER TABLE finance_records ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE finance_records ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE finance_records ADD COLUMN IF NOT EXISTS service_name TEXT;
ALTER TABLE finance_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'paid';
ALTER TABLE finance_records ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;
ALTER TABLE finance_records ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- PASSO 3: Cria a versão ÚNICA e CANÔNICA do RPC
-- Assinatura: (TEXT, TEXT, TEXT) — compatível 100% com o chamador no Finance.tsx
CREATE OR REPLACE FUNCTION public.get_finance_stats(
  p_user_id TEXT,
  p_start_date TEXT DEFAULT NULL,
  p_end_date TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date        TIMESTAMP;
  v_end_date          TIMESTAMP;
  v_revenue           DECIMAL(10,2);
  v_expenses          DECIMAL(10,2);
  v_pending_expenses  DECIMAL(10,2);
  v_commissions_pending DECIMAL(10,2);
  v_profit            DECIMAL(10,2);
  v_chart_data        JSON;
  v_transactions      JSON;
  v_revenue_by_method JSON;
  v_result            JSON;
BEGIN
  -- Define intervalo de datas (inclui o dia inteiro da data final)
  v_start_date := COALESCE(
    p_start_date::TIMESTAMP,
    (NOW() - INTERVAL '30 days')::DATE::TIMESTAMP
  );
  v_end_date := (
    COALESCE(p_end_date::TIMESTAMP, NOW())::DATE + INTERVAL '1 day' - INTERVAL '1 millisecond'
  )::TIMESTAMP;

  -- -----------------------------------------------------------------------
  -- RECEITA TOTAL:
  --   1. Agendamentos concluídos no período
  --   2. Entradas manuais (finance_records tipo 'revenue' sem appointment_id)
  -- -----------------------------------------------------------------------
  SELECT COALESCE(SUM(amount), 0) INTO v_revenue
  FROM (
    -- Agendamentos concluídos
    SELECT price AS amount
    FROM appointments
    WHERE user_id = p_user_id
      AND status = 'Completed'
      AND appointment_time >= v_start_date
      AND appointment_time <= v_end_date

    UNION ALL

    -- Entradas manuais (sem vínculo com agendamento)
    SELECT revenue AS amount
    FROM finance_records
    WHERE user_id = p_user_id
      AND type = 'revenue'
      AND appointment_id IS NULL
      AND created_at >= v_start_date
      AND created_at <= v_end_date
  ) r;

  -- -----------------------------------------------------------------------
  -- DESPESAS PAGAS (saída de caixa efetiva)
  -- -----------------------------------------------------------------------
  SELECT COALESCE(SUM(commission_value), 0) INTO v_expenses
  FROM finance_records
  WHERE user_id = p_user_id
    AND type = 'expense'
    AND (commission_paid IS TRUE OR status = 'paid')
    AND created_at >= v_start_date
    AND created_at <= v_end_date;

  -- -----------------------------------------------------------------------
  -- DESPESAS PENDENTES (ainda não saíram do caixa)
  -- -----------------------------------------------------------------------
  SELECT COALESCE(SUM(commission_value), 0) INTO v_pending_expenses
  FROM finance_records
  WHERE user_id = p_user_id
    AND type = 'expense'
    AND (commission_paid IS FALSE OR commission_paid IS NULL)
    AND (status IS NULL OR status = 'pending')
    AND created_at >= v_start_date
    AND created_at <= v_end_date;

  -- -----------------------------------------------------------------------
  -- COMISSÕES PENDENTES (a pagar para profissionais — geradas automaticamente)
  -- -----------------------------------------------------------------------
  SELECT COALESCE(SUM(commission_value), 0) INTO v_commissions_pending
  FROM finance_records
  WHERE user_id = p_user_id
    AND type = 'revenue'
    AND commission_paid IS FALSE
    AND commission_value > 0
    AND created_at >= v_start_date
    AND created_at <= v_end_date;

  -- -----------------------------------------------------------------------
  -- LUCRO LÍQUIDO
  -- -----------------------------------------------------------------------
  v_profit := v_revenue - v_expenses;

  -- -----------------------------------------------------------------------
  -- DADOS DO GRÁFICO (agrupamento diário)
  -- Inclui: agendamentos + entradas manuais + despesas (pagas e pendentes)
  -- -----------------------------------------------------------------------
  SELECT json_agg(row_to_json(t)) INTO v_chart_data
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

      -- Entradas manuais (finance_records revenue sem appointment) → receita
      SELECT DATE(created_at) AS date, 'revenue' AS tipo, revenue AS val
      FROM finance_records
      WHERE user_id = p_user_id
        AND type = 'revenue'
        AND appointment_id IS NULL
        AND created_at >= v_start_date
        AND created_at <= v_end_date

      UNION ALL

      -- Despesas manuais (todos os lançamentos type = 'expense') → despesa
      -- Inclui pendentes para representar o impacto no fluxo de caixa
      SELECT DATE(created_at) AS date, 'expense' AS tipo, commission_value AS val
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
  -- RECEITA POR MÉTODO DE PAGAMENTO (apenas agendamentos concluídos)
  -- -----------------------------------------------------------------------
  SELECT json_build_object(
    'pix',      COALESCE(SUM(CASE WHEN LOWER(payment_method) = 'pix' THEN price ELSE 0 END), 0),
    'dinheiro', COALESCE(SUM(CASE WHEN LOWER(payment_method) IN ('dinheiro', 'cash') THEN price ELSE 0 END), 0),
    'cartao',   COALESCE(SUM(CASE WHEN LOWER(payment_method) LIKE '%cart%' OR LOWER(payment_method) LIKE '%card%' THEN price ELSE 0 END), 0)
  ) INTO v_revenue_by_method
  FROM appointments
  WHERE user_id = p_user_id
    AND status = 'Completed'
    AND appointment_time >= v_start_date
    AND appointment_time <= v_end_date;

  -- -----------------------------------------------------------------------
  -- TRANSAÇÕES RECENTES
  -- Fontes:
  --   A) Agendamentos concluídos (receitas automáticas)
  --   B) Finance records manuais (receitas E despesas)
  --      - Exclui os finance_records gerados automaticamente por agendamentos
  --        (type = 'revenue' E appointment_id NOT NULL) para evitar duplicação
  --   JOIN retroativo: recupera service_name de registros históricos sem nome
  -- -----------------------------------------------------------------------
  SELECT json_agg(row_to_json(tr)) INTO v_transactions
  FROM (
    SELECT * FROM (

      -- (A) Agendamentos concluídos → receita automática
      SELECT
        a.id,
        a.appointment_time               AS created_at,
        tm.name                          AS barber_name,
        cl.name                          AS client_name,
        a.service                        AS service_name,
        NULL::TEXT                       AS description,
        a.price                          AS amount,
        0::DECIMAL                       AS expense,
        'revenue'::TEXT                  AS type,
        TRUE                             AS commission_paid,
        a.payment_method,
        'paid'::TEXT                     AS status
      FROM appointments a
      LEFT JOIN team_members tm ON a.professional_id = tm.id
      LEFT JOIN clients cl ON a.client_id = cl.id
      WHERE a.user_id = p_user_id
        AND a.status = 'Completed'
        AND a.appointment_time >= v_start_date
        AND a.appointment_time <= v_end_date

      UNION ALL

      -- (B) Finance records manuais (receitas e despesas)
      -- JOIN retroativo: service_name via appointment_id para registros antigos
      SELECT
        f.id,
        f.created_at,
        f.barber_name,
        f.client_name,
        -- Identificação retroativa: tenta f.service_name, depois serviço do
        -- agendamento vinculado, depois description, depois 'Sem descrição'
        COALESCE(
          NULLIF(f.service_name, ''),
          a_link.service,
          NULLIF(f.description, ''),
          'Sem descrição'
        )                                AS service_name,
        f.description,
        CASE WHEN f.type = 'revenue' THEN COALESCE(f.revenue, 0) ELSE 0 END AS amount,
        CASE WHEN f.type = 'expense' THEN COALESCE(f.commission_value, 0) ELSE 0 END AS expense,
        f.type,
        COALESCE(f.commission_paid, FALSE) AS commission_paid,
        f.payment_method,
        COALESCE(
          f.status,
          CASE
            WHEN f.type = 'expense' AND (f.commission_paid IS FALSE OR f.commission_paid IS NULL) THEN 'pending'
            ELSE 'paid'
          END
        )                                AS status
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
    'revenue',              v_revenue,
    'expenses',             v_expenses,
    'pendingExpenses',      v_pending_expenses,
    'commissions_pending',  v_commissions_pending,
    'profit',               v_profit,
    'revenue_by_method',    COALESCE(v_revenue_by_method, '{"pix":0,"dinheiro":0,"cartao":0}'::json),
    'chart_data',           COALESCE(v_chart_data,        '[]'::json),
    'transactions',         COALESCE(v_transactions,      '[]'::json)
  );

  RETURN v_result;
END;
$$;

-- Concede permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_finance_stats(TEXT, TEXT, TEXT) TO authenticated;

-- Índices de performance (idempotentes)
CREATE INDEX IF NOT EXISTS idx_appointments_user_time_status
  ON appointments(user_id, appointment_time, status);

CREATE INDEX IF NOT EXISTS idx_finance_records_user_created
  ON finance_records(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_finance_records_type_appointment
  ON finance_records(user_id, type, appointment_id);
