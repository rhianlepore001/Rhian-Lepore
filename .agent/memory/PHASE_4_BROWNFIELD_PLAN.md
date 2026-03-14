# Fase 4: Brownfield Discovery — Mapeamento Completo da Arquitetura

**Status:** 🟡 Planejamento | **Data:** 14 Mar 2026 | **Duração estimada:** 4-6 horas (parallelizável)

---

## 🎯 Objetivo

Mapear completamente a arquitetura, técnico debt, e saúde do schema do Beauty OS para:
1. **Identificar gaps** e problemas técnicos existentes
2. **Documentar decisões** e padrões já implementados
3. **Avaliar technical debt** por criticidade
4. **Gerar roadmap** de refatorações/improvements
5. **Produzir relatório executivo** para stakeholders

---

## 📊 10 Fases de Brownfield Discovery

### Fase 4.1: System Architecture Analysis (@architect — Aria)

**Responsável:** @architect (1.5h)
**Output:** `system-architecture.md`

**O que mapear:**

```yaml
1. Frontend Architecture
   ├─ Entry point: App.tsx
   ├─ Routing: React Router 7 + HashRouter pattern
   ├─ State management: React Context API
   │  ├─ AuthContext (authentication state)
   │  ├─ AlertsContext (toast notifications)
   │  ├─ PublicClientContext (public booking)
   │  └─ UIContext (theme preferences)
   ├─ Component structure: pages/ (20+ pages) + components/ (50+ components)
   ├─ Lazy loading: React.lazy() for code splitting
   └─ Styling: Tailwind CSS + custom theme (Brutal/Beauty)

2. Backend Architecture
   ├─ Database: Supabase PostgreSQL
   ├─ API layer: Direct Supabase client (no REST layer)
   ├─ RPCs: 41 database functions
   ├─ Multi-tenancy: company_id filtering + RLS
   └─ Auth: Supabase Auth (Clerk rejected, see ADR)

3. Integration Points
   ├─ Gemini API: Google Generative AI
   ├─ Stripe: Payment processing
   ├─ Supabase Storage: Image buckets (6 total)
   └─ Vercel: Deployment platform

4. Data Flow
   ├─ User login → Supabase Auth → AuthContext
   ├─ Data fetch → Supabase RPC → Component state
   ├─ Updates → Supabase UPDATEs → Real-time sync (Realtime API)
   └─ Public booking → Public RPC → No auth required

5. Security Model
   ├─ RLS enabled on all tables
   ├─ SECURITY DEFINER functions
   ├─ Multi-tenant isolation via user_id/company_id
   └─ Rate limiting (Token Bucket pattern)
```

**Questões a responder:**
- [ ] Todas as tabelas têm RLS?
- [ ] Todas as RPCs têm SECURITY DEFINER?
- [ ] Onde estão os gargalos de performance?
- [ ] Qual é a lógica de scaling atual?

---

### Fase 4.2: Database Schema Audit (@data-engineer — Dara)

**Responsável:** @data-engineer (2h)
**Outputs:** `SCHEMA.md`, `DB-AUDIT.md`

**O que auditar:**

```sql
-- 1. Verificar todas as 19 tabelas
SELECT tablename FROM pg_tables WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Verificar RLS status (deve estar ENABLED em todas)
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 3. Contar RPCs (deve ter 41+)
SELECT proname, prokind, pronargs
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
ORDER BY proname;

-- 4. Validar índices (performance)
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;

-- 5. Verificar tamanho das tabelas (capacity)
SELECT schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 6. Foreign key relationships
SELECT constraint_name, table_name, column_name, referenced_table_name
FROM information_schema.key_column_usage
WHERE table_schema = 'public' AND referenced_table_name IS NOT NULL;

-- 7. Storage buckets health
-- Verificar em .supabase/config.yaml ou via Supabase CLI
```

**Checklist:**
- [ ] 19 tabelas + audit_logs + system_errors?
- [ ] RLS ENABLED em todas as 19?
- [ ] 41+ RPCs com SECURITY DEFINER?
- [ ] Índices otimizados?
- [ ] Foreign keys sem orphans?
- [ ] Tamanho das tabelas dentro do esperado?
- [ ] pgvector extensão ativa (768 dims)?
- [ ] Nenhuma política RLS duplicada?

---

### Fase 4.3: Frontend Specification (@ux-design-expert — Uma)

**Responsável:** @ux-design-expert (1.5h)
**Output:** `frontend-spec.md`

**O que mapear:**

```yaml
Pages (20+):
  ├─ Dashboard.tsx
  ├─ Agenda.tsx
  ├─ Finance.tsx
  ├─ Reports.tsx
  ├─ ClientCRM.tsx
  ├─ Marketing.tsx
  ├─ /settings/ (7 pages)
  ├─ /public/ (PublicBooking, QueueJoin, QueueStatus, ProfessionalPortfolio)
  └─ [mais 5+ pages]

Components (50+):
  ├─ Modal components (AppointmentEditModal, ClientAuthModal, etc.)
  ├─ Feature components (CommissionsManagement, BusinessHoursEditor, etc.)
  ├─ Styled components (BrutalCard, BrutalButton, BrutalBackground)
  └─ [mais 40+ components]

Design System:
  ├─ Colors: Brutal theme (dark, bold) + Beauty theme (elegant, clean)
  ├─ Typography: Tailwind scale
  ├─ Spacing: 8px grid
  ├─ Icons: Lucide React (50+ icons used)
  └─ Charts: Recharts (data visualization)

Accessibility:
  ├─ WCAG 2.1 compliance?
  ├─ Keyboard navigation?
  ├─ Screen reader support?
  └─ Color contrast ratios?
```

---

### Fase 4.4: Technical Debt Draft (@architect — Aria)

**Responsável:** @architect (1.5h)
**Input:** Outputs from 4.1, 4.2, 4.3
**Output:** `technical-debt-DRAFT.md`

**Categorias de debt:**

```yaml
CRÍTICA (impact > 5, effort < 3):
  - [ ] Missing RLS policies (security vulnerability)
  - [ ] Unindexed columns causing N+1 queries
  - [ ] Missing error handling in critical paths

ALTA (impact > 4, effort < 4):
  - [ ] Legacy Clerk migration code (already rejected)
  - [ ] Outdated dependencies
  - [ ] Missing unit tests (coverage < 50%)

MÉDIA (impact > 2, effort < 5):
  - [ ] Code duplication in components
  - [ ] Missing TypeScript types
  - [ ] Inconsistent error messages

BAIXA (impact > 1, effort > 4):
  - [ ] Code style inconsistencies
  - [ ] Missing documentation
  - [ ] Unused variables/imports
```

---

### Fase 4.5: Database Specialist Review (@data-engineer — Dara)

**Responsável:** @data-engineer (1h)
**Input:** `technical-debt-DRAFT.md`
**Output:** `db-specialist-review.md`

**Foco em database:**
- [ ] Schema normalization (3NF compliant?)
- [ ] Query optimization opportunities
- [ ] Missing indexes
- [ ] RLS policy completeness
- [ ] Migration order/dependencies
- [ ] Data integrity constraints
- [ ] Backup/recovery strategy

---

### Fase 4.6: UX Specialist Review (@ux-design-expert — Uma)

**Responsável:** @ux-design-expert (1h)
**Input:** `technical-debt-DRAFT.md`
**Output:** `ux-specialist-review.md`

**Foco em frontend/UX:**
- [ ] Accessibility compliance
- [ ] Performance bottlenecks
- [ ] Component reusability
- [ ] Design system coverage
- [ ] Mobile responsiveness
- [ ] User experience pain points
- [ ] Onboarding flow

---

### Fase 4.7: QA Gate (@qa — Quinn)

**Responsável:** @qa (1h)
**Input:** `db-specialist-review.md`, `ux-specialist-review.md`
**Output:** `qa-review.md` + **VERDICT**

**QA Gate Criteria:**

```yaml
Verdict: APPROVED
- All major technical debt identified
- No critical gaps in reviews
- Database schema fully documented
- Frontend spec complete
- Security concerns addressed

Verdict: NEEDS WORK
- Missing critical reviews
- Incomplete findings
- Unclear priorities
- Remediation: Return to Phase 4.4
```

---

### Fase 4.8: Final Technical Debt Assessment (@architect — Aria)

**Responsável:** @architect (1h)
**Input:** All reviews + QA verdict
**Output:** `technical-debt-assessment.md`

**Estrutura final:**

```markdown
# Technical Debt Assessment — Beauty OS

## Executive Summary
- Total debt items: 47
- Critical: 5 (6h to fix)
- High: 12 (24h to fix)
- Medium: 18 (40h to fix)
- Low: 12 (16h to fix)
- **Total effort:** 86 hours

## Top 5 Critical Items
1. [Item 1] — 6h — [Link to issue]
2. [Item 2] — 5h — [Link to issue]
...

## By Category
- **Database:** 8 items (12h)
- **Frontend:** 15 items (28h)
- **Security:** 6 items (14h)
- **Performance:** 10 items (18h)
- **Testing:** 8 items (14h)

## Roadmap (12-week plan)
- **Week 1-2:** Critical items (12h)
- **Week 3-4:** High priority (24h)
- **Week 5-8:** Medium priority (40h)
- **Week 9-12:** Low priority + contingency (16h)
```

---

### Fase 4.9: Executive Report (@analyst — Alex)

**Responsável:** @analyst (1.5h)
**Input:** `technical-debt-assessment.md`
**Output:** `TECHNICAL-DEBT-REPORT.md` (non-technical stakeholders)

**Para executivos:**
```markdown
# Technical Health Report — Beauty OS

## Status: 🟡 YELLOW (Generally Healthy, Opportunities for Improvement)

### Key Metrics
- Code Coverage: 35% (Target: 70%)
- Performance Score: 78/100 (Acceptable)
- Security Score: 92/100 (Strong)
- Architecture Debt: 47 items

### Business Impact
- [ ] Estimated productivity loss: 2-3% per sprint
- [ ] Estimated bug rate increase: 15% vs industry average
- [ ] Time to deliver features: +20% vs optimal

### Recommended Actions (Priority Order)
1. **Immediate (Week 1):** Fix critical security gaps
2. **Short-term (Month 1):** Improve test coverage
3. **Medium-term (Quarter 1):** Refactor core components
4. **Long-term (Year 1):** Modernize architecture

### Estimated ROI
- **Investment:** 86 hours
- **Payback:** 4-6 weeks (faster feature delivery, fewer bugs)
- **Long-term value:** 15-20% productivity improvement
```

---

### Fase 4.10: Epic Generation (@pm — Morgan)

**Responsável:** @pm (1h)
**Input:** `TECHNICAL-DEBT-REPORT.md`
**Output:** 5-8 Epics ready for backlog

**Epics a criar:**

```yaml
Epic 1: Technical Debt Cleanup — Phase 1 (Critical)
  - US-007: Fix 5 critical security gaps (6h)
  - US-008: Missing RLS policies audit (4h)
  - US-009: Remove deprecated code (2h)

Epic 2: Testing & Coverage
  - US-010: Unit test foundation (20h)
  - US-011: Integration tests for APIs (16h)
  - US-012: E2E tests (12h)

Epic 3: Performance Optimization
  - US-013: Database query optimization (10h)
  - US-014: Frontend component optimization (8h)
  - US-015: Bundle size reduction (6h)

... (3-5 more epics)
```

---

## 🔄 Workflow Parallelizável

**O que pode rodar em paralelo:**

```
Fase 4.1 (Architecture)  ─┐
Fase 4.2 (Database)      ├─→ Fase 4.4-4.6 (Reviews) ─→ Fase 4.7 (QA Gate)
Fase 4.3 (Frontend)      ─┘
                              ↓
                         Fase 4.8 (Final)
                              ↓
                         Fase 4.9 (Report)
                              ↓
                         Fase 4.10 (Epics)
```

**Tempo Real (Parallelizado):**
- Fases 4.1-4.3: 1.5h (rodam paralelas)
- Fases 4.4-4.6: 3.5h (sequencial)
- Fases 4.7-4.10: 3.5h (sequencial)
- **Total: ~4-5 horas** (vs 10 horas sequencial)

---

## 📋 Inputs Necessários

### Do Repositório
- ✅ `.gemini/antigravity/brain/c118f576.../implementation_plan.md` (schema reference)
- ✅ `supabase/migrations/` (64 migrations)
- ✅ `pages/`, `components/`, `hooks/`, `lib/`, `utils/` (código)
- ✅ `test/` (testes existentes)

### Do Ambiente
- [ ] Acesso a Supabase dashboard (para queries)
- [ ] npm run lint (ESLint report)
- [ ] npm run typecheck (TypeScript errors)
- [ ] npm test (coverage report)

---

## 📊 Deliverables

| Fase | Responsável | Output | Tamanho Estimado |
|------|---|---|---|
| 4.1 | @architect | system-architecture.md | 30-40 KB |
| 4.2 | @data-engineer | SCHEMA.md + DB-AUDIT.md | 50-70 KB |
| 4.3 | @ux-design-expert | frontend-spec.md | 30-50 KB |
| 4.4 | @architect | technical-debt-DRAFT.md | 40-60 KB |
| 4.5 | @data-engineer | db-specialist-review.md | 10-15 KB |
| 4.6 | @ux-design-expert | ux-specialist-review.md | 10-15 KB |
| 4.7 | @qa | qa-review.md + VERDICT | 5-10 KB |
| 4.8 | @architect | technical-debt-assessment.md | 50-70 KB |
| 4.9 | @analyst | TECHNICAL-DEBT-REPORT.md | 20-30 KB |
| 4.10 | @pm | 5-8 Epics | 15-20 KB |

**Total:** ~270-420 KB de documentação

---

## 🚀 Como Executar

### Opção 1: Full Brownfield (4-5h, parallelizado)
```bash
# Rodar tudo em paralelo com agentes
@architect *start-phase-41-system-architecture
@data-engineer *start-phase-42-database-audit
@ux-design-expert *start-phase-43-frontend-spec
# Após completarem:
@architect *start-phase-44-draft-debt
# Etc...
```

### Opção 2: Fokus (2-3h, apenas críticos)
```bash
# Só fases críticas
@data-engineer *database-audit (30 min)
@qa *security-scan (30 min)
@architect *critical-debt-only (60 min)
@pm *generate-critical-epics (30 min)
```

---

## ✅ Checklist

- [ ] Fase 4.1: Architecture mapped
- [ ] Fase 4.2: Database audited
- [ ] Fase 4.3: Frontend specified
- [ ] Fase 4.4: Debt draft complete
- [ ] Fase 4.5: DB review done
- [ ] Fase 4.6: UX review done
- [ ] Fase 4.7: QA gate passed (APPROVED)
- [ ] Fase 4.8: Final assessment
- [ ] Fase 4.9: Executive report
- [ ] Fase 4.10: Epics created

---

**Próximo:** Após Phase 4, começar sprints de desenvolvimento baseados nos epics gerados.

**Arquivo Canônico Banco:** `.gemini/antigravity/brain/c118f576.../implementation_plan.md`
