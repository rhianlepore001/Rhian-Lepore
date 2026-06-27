-- ==========================================================================
-- Bug Reporter — Triagem (níveis 1-5) + Captura automática
-- Complementa 20260626000001_bug_reports.sql.
-- Ver docs/features/bug-triage-agent.md
-- ==========================================================================
-- Adiciona:
--   * level (1-5)           → severidade que o agente de triagem atribui
--   * source (manual|auto)  → distingue o que o cliente reporta do que o app captura sozinho
--   * dedup_key / occurrences / last_seen_at → anti-spam de erros automáticos
--   * triage_summary / triage_plan / triaged_at → saída do agente (o que está errado + plano)
--   * RPC upsert_auto_bug_report → insere OU incrementa ocorrência (server-side, com tenant)
-- Tudo idempotente. Não mexe nas policies já criadas na 20260626000001.
-- ==========================================================================

-- ========================================
-- 1. NOVAS COLUNAS
-- ========================================
ALTER TABLE public.bug_reports
  ADD COLUMN IF NOT EXISTS level         SMALLINT     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS source        TEXT         NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS dedup_key     TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS occurrences   INTEGER      NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_seen_at  TIMESTAMPTZ  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS triage_summary TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS triage_plan   TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS triaged_at    TIMESTAMPTZ  DEFAULT NULL;

-- CHECK de level (1-5). Adicionado separado pra ser idempotente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bug_reports_level_check'
  ) THEN
    ALTER TABLE public.bug_reports
      ADD CONSTRAINT bug_reports_level_check
      CHECK (level IS NULL OR (level BETWEEN 1 AND 5));
  END IF;
END $$;

-- CHECK de source.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bug_reports_source_check'
  ) THEN
    ALTER TABLE public.bug_reports
      ADD CONSTRAINT bug_reports_source_check
      CHECK (source IN ('manual','auto'));
  END IF;
END $$;

-- Índice pra fila de triagem (status='new' ordenado por mais recente).
CREATE INDEX IF NOT EXISTS idx_bug_reports_triage_queue
  ON public.bug_reports (status, created_at DESC);

-- Índice pro anti-spam (procurar bug auto aberto com a mesma dedup_key).
CREATE INDEX IF NOT EXISTS idx_bug_reports_dedup
  ON public.bug_reports (company_id, source, dedup_key)
  WHERE source = 'auto';

-- ========================================
-- 2. RPC: upsert_auto_bug_report
-- ========================================
-- Chamada pelo app quando captura um erro sozinho. Se já existe um bug
-- automático ABERTO com a mesma dedup_key naquele tenant, só incrementa a
-- contagem de ocorrências (não cria duplicata). Caso contrário, insere.
-- SECURITY DEFINER + get_auth_company_id() garantem o isolamento por tenant.
CREATE OR REPLACE FUNCTION public.upsert_auto_bug_report(
  p_title         TEXT,
  p_description   TEXT,
  p_category      TEXT,
  p_context       JSONB,
  p_dedup_key     TEXT,
  p_screenshot_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company TEXT := public.get_auth_company_id();
  v_user    TEXT := auth.uid()::text;
  v_id      UUID;
  v_category TEXT;
BEGIN
  -- Sem sessão/tenant → não registra (evita lixo de páginas públicas).
  IF v_company IS NULL THEN
    RETURN NULL;
  END IF;

  -- Categoria precisa respeitar o CHECK da tabela; cai pra 'other' se vier algo fora.
  v_category := CASE
    WHEN p_category IN ('agenda','login','clients','finance','queue','settings','modal','other')
      THEN p_category
    ELSE 'other'
  END;

  -- Já existe um automático aberto com a mesma assinatura? Incrementa.
  SELECT id INTO v_id
    FROM public.bug_reports
   WHERE company_id = v_company
     AND source = 'auto'
     AND dedup_key = p_dedup_key
     AND status IN ('new','triaged','planned','in_progress')
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE public.bug_reports
       SET occurrences  = occurrences + 1,
           last_seen_at = NOW(),
           updated_at   = NOW()
     WHERE id = v_id;
    RETURN v_id;
  END IF;

  INSERT INTO public.bug_reports (
    company_id, user_id, type, status, category, mode, source,
    title, description, context, screenshot_url,
    dedup_key, occurrences, last_seen_at
  ) VALUES (
    v_company, v_user, 'bug', 'new', v_category, 'simple', 'auto',
    p_title, p_description, p_context, p_screenshot_url,
    p_dedup_key, 1, NOW()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Só usuários autenticados executam. Revoga o EXECUTE padrão de PUBLIC/anon
-- (a função é SECURITY DEFINER; sem isso o advisor acusa exposição ao anon).
REVOKE EXECUTE ON FUNCTION
  public.upsert_auto_bug_report(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT)
  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION
  public.upsert_auto_bug_report(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT)
  FROM anon;
GRANT EXECUTE ON FUNCTION
  public.upsert_auto_bug_report(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT)
  TO authenticated;

-- ==========================================================================
-- Fim — ver docs/features/bug-triage-agent.md para o fluxo do agente de triagem.
-- ==========================================================================
