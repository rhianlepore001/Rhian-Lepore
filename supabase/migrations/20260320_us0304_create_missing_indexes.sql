-- ============================================================================
-- US-0304: Criar 5 indices de banco de dados criticos
-- Epic: EPIC-003-S1 | Prioridade: P0 | Autor: Dara (@data-engineer) | 2026-03-20
-- ============================================================================
--
-- PROBLEMA: 5 indices criticos ausentes causam seq scans e queries lentas.
-- SOLUCAO: Criar indices com CREATE INDEX CONCURRENTLY para evitar bloqueio.
-- IMPACTO ESPERADO: Melhoria de 20-30% em queries de dashboard e CRM.
--
-- NOTA: CONCURRENTLY nao pode ser executado dentro de uma transacao.
--       Aplique este arquivo fora de um bloco BEGIN/COMMIT.
--
-- ROLLBACK:
--   DROP INDEX CONCURRENTLY IF EXISTS idx_profiles_business_slug;
--   DROP INDEX CONCURRENTLY IF EXISTS idx_appointments_company_status;
--   DROP INDEX CONCURRENTLY IF EXISTS idx_appointments_professional_date;
--   DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_company_date;
--   DROP INDEX CONCURRENTLY IF EXISTS idx_services_company_active;
-- ============================================================================

-- Indice 1: profiles.business_slug
-- Melhora lookup de perfis publicos por slug de negocio (PublicBooking, Portfolio)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_business_slug
  ON profiles(business_slug)
  WHERE business_slug IS NOT NULL;

COMMENT ON INDEX idx_profiles_business_slug IS
  'Indice parcial em profiles.business_slug. '
  'Melhora lookup de perfis publicos por slug. '
  'Criado em US-0304 (2026-03-20). Estimativa: +20-25% nas queries de PublicBooking.';

-- Indice 2: appointments(company_id, status)
-- Melhora filtros de agendamentos por empresa e status (Dashboard, Agenda)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_company_status
  ON appointments(company_id, status);

COMMENT ON INDEX idx_appointments_company_status IS
  'Indice composto em appointments(company_id, status). '
  'Melhora queries de agendamentos filtrados por empresa e status. '
  'Criado em US-0304 (2026-03-20). Estimativa: +25-30% nas queries do Dashboard.';

-- Indice 3: appointments(professional_id, scheduled_date)
-- Melhora queries de agenda por profissional e data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_professional_date
  ON appointments(professional_id, scheduled_date);

COMMENT ON INDEX idx_appointments_professional_date IS
  'Indice composto em appointments(professional_id, scheduled_date). '
  'Melhora queries de agenda filtradas por profissional e data. '
  'Criado em US-0304 (2026-03-20). Estimativa: +25% nas queries de Agenda.';

-- Indice 4: transactions(company_id, created_at DESC)
-- Melhora relatorios financeiros por empresa e periodo (Finance, Dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_company_date
  ON transactions(company_id, created_at DESC);

COMMENT ON INDEX idx_transactions_company_date IS
  'Indice composto em transactions(company_id, created_at DESC). '
  'Melhora relatorios financeiros e queries de receita por periodo. '
  'Criado em US-0304 (2026-03-20). Estimativa: +30% nas queries de Finance.';

-- Indice 5: services(company_id, is_active)
-- Melhora listagem de servicos ativos por empresa (Booking, Services)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_company_active
  ON services(company_id, is_active)
  WHERE is_active = true;

COMMENT ON INDEX idx_services_company_active IS
  'Indice parcial em services(company_id, is_active) WHERE is_active = true. '
  'Melhora listagem de servicos ativos para booking e edicao. '
  'Criado em US-0304 (2026-03-20). Estimativa: +20% nas queries de servicos.';

-- VERIFICACAO (executar apos aplicar):
-- SELECT indexname, tablename FROM pg_indexes
-- WHERE indexname IN (
--   'idx_profiles_business_slug',
--   'idx_appointments_company_status',
--   'idx_appointments_professional_date',
--   'idx_transactions_company_date',
--   'idx_services_company_active'
-- )
-- ORDER BY tablename, indexname;
-- -> Deve retornar 5 linhas (AC1 verificado)
