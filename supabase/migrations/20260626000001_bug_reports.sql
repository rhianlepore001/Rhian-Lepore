-- ==========================================================================
-- Bug Reporter Foundation
-- Tabela bug_reports + bucket de screenshots + policies.
-- Ver docs/features/bug-reporter.md
-- ==========================================================================
-- Nota multi-tenant: company_id e user_id sao TEXT (mesmo padrao de profiles).
-- RLS reaproveita get_auth_company_id() definida em 20260307_us015b_multi_user_rls.sql.
-- A funcao update_updated_at_column() foi definida em 20260218_add_updated_at_column.sql.
-- ==========================================================================

-- ========================================
-- 1. TABELA bug_reports
-- ========================================

CREATE TABLE IF NOT EXISTS public.bug_reports (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         TEXT NOT NULL,
  user_id            TEXT NOT NULL,
  type               TEXT NOT NULL DEFAULT 'question'
                     CHECK (type IN ('bug','ux','backend','frontend','idea','question')),
  severity           TEXT NOT NULL DEFAULT 'low'
                     CHECK (severity IN ('low','medium','high','critical')),
  status             TEXT NOT NULL DEFAULT 'new'
                     CHECK (status IN ('new','triaged','planned','in_progress','fixed','wontfix')),
  category           TEXT NOT NULL DEFAULT 'other'
                     CHECK (category IN ('agenda','login','clients','finance','queue','settings','modal','other')),
  mode               TEXT NOT NULL DEFAULT 'simple'
                     CHECK (mode IN ('simple','advanced')),
  title              TEXT NOT NULL,
  description        TEXT NOT NULL,
  steps_to_reproduce TEXT[] DEFAULT NULL,
  expected_behavior  TEXT DEFAULT NULL,
  actual_behavior    TEXT DEFAULT NULL,
  context            JSONB DEFAULT NULL,
  screenshot_url     TEXT DEFAULT NULL,
  is_dev             BOOLEAN DEFAULT NULL,
  tags               TEXT[] DEFAULT NULL,
  assignee_id        TEXT DEFAULT NULL,
  internal_notes     TEXT DEFAULT NULL,
  resolved_at        TIMESTAMPTZ DEFAULT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bug_reports_company_status
  ON public.bug_reports (company_id, status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created
  ON public.bug_reports (created_at DESC);

-- ========================================
-- 2. updated_at TRIGGER (reaproveita funcao existente)
-- ========================================
-- update_updated_at_column() ja existe (20260218_add_updated_at_column.sql).
-- Se ela nao existir por algum motivo, descomente o bloco abaixo:
-- CREATE OR REPLACE FUNCTION public.update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
-- $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bug_reports_updated_at ON public.bug_reports;
CREATE TRIGGER update_bug_reports_updated_at
  BEFORE UPDATE ON public.bug_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- 3. RLS
-- ========================================
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bug_reports_select ON public.bug_reports;
CREATE POLICY bug_reports_select ON public.bug_reports
  FOR SELECT USING (company_id = public.get_auth_company_id());

DROP POLICY IF EXISTS bug_reports_insert ON public.bug_reports;
CREATE POLICY bug_reports_insert ON public.bug_reports
  FOR INSERT WITH CHECK (company_id = public.get_auth_company_id());

DROP POLICY IF EXISTS bug_reports_update ON public.bug_reports;
CREATE POLICY bug_reports_update ON public.bug_reports
  FOR UPDATE USING (company_id = public.get_auth_company_id())
  WITH CHECK (company_id = public.get_auth_company_id());

DROP POLICY IF EXISTS bug_reports_delete ON public.bug_reports;
CREATE POLICY bug_reports_delete ON public.bug_reports
  FOR DELETE USING (company_id = public.get_auth_company_id());

-- ========================================
-- 4. BUCKET DE SCREENSHOTS
-- ==========================================================================
-- insert em storage.buckets exige service role; com anon/supabase-migrations
-- pode falhar. Se falhar, rode manualmente no SQL Editor como service_role:
--   INSERT INTO storage.buckets (id, name, public)
--   VALUES ('bug-screenshots','bug-screenshots', true)
--   ON CONFLICT (id) DO NOTHING;
-- ==========================================================================
DO $$
BEGIN
  BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('bug-screenshots', 'bug-screenshots', true)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN insufficient_privilege OR check_violation OR others THEN
    RAISE NOTICE 'Bucket bug-screenshots nao pode ser criado aqui — crie manualmente com service_role.';
  END;
END $$;

-- ========================================
-- 5. STORAGE POLICIES (caminho: {company_id}/{bugId}.png)
-- ========================================

DROP POLICY IF EXISTS bug_screenshots_select ON storage.objects;
CREATE POLICY bug_screenshots_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'bug-screenshots'
    AND (storage.foldername(name))[1] = public.get_auth_company_id()
  );

DROP POLICY IF EXISTS bug_screenshots_insert ON storage.objects;
CREATE POLICY bug_screenshots_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'bug-screenshots'
    AND (storage.foldername(name))[1] = public.get_auth_company_id()
  );

DROP POLICY IF EXISTS bug_screenshots_update ON storage.objects;
CREATE POLICY bug_screenshots_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'bug-screenshots'
    AND (storage.foldername(name))[1] = public.get_auth_company_id()
  )
  WITH CHECK (
    bucket_id = 'bug-screenshots'
    AND (storage.foldername(name))[1] = public.get_auth_company_id()
  );

DROP POLICY IF EXISTS bug_screenshots_delete ON storage.objects;
CREATE POLICY bug_screenshots_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'bug-screenshots'
    AND (storage.foldername(name))[1] = public.get_auth_company_id()
  );

-- Bug Reporter — ver docs/features/bug-reporter.md