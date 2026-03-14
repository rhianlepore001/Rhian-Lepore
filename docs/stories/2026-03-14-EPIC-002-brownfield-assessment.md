# EPIC-002: Avaliação Técnica Completa do Beauty OS (Brownfield Discovery)

> **Status:** Draft
> **Criado por:** @pm (Morgan)
> **Data:** 2026-03-14
> **Prioridade:** P0 — Essencial para roadmap de produto
> **Estimativa:** 10 stories, 4-5 horas (paralelizável)
> **Branch:** Fase 4 de AIOX Integration

---

## Visão do Épico

Mapear completamente a arquitetura, technical debt e saúde do schema do Beauty OS após migração AIOS/AIOX. Gerar roadmap executivo de refatorações e melhorias para:

1. **Identificar gaps** técnicos e vulnerabilidades
2. **Documentar decisões** e padrões já implementados
3. **Avaliar technical debt** por criticidade (P0/P1/P2)
4. **Gerar roadmap** de 12 semanas para correção
5. **Produzir relatório** para stakeholders não-técnicos

**Problema central:** O projeto precisa de uma "limpeza técnica" sistemática antes de escalar novas features. Falta visibilidade sobre debt, segurança e performance.

**Resultado esperado:** 10 documentos técnicos + 5-8 epics prontos para desenvolvimento, com priorização clara de problemas.

---

## Contexto do Sistema Existente

**Tech Stack:**
- Frontend: React 19, TypeScript 5.8, Vite 6
- Backend: Supabase PostgreSQL (27 tabelas + 41 RPCs)
- Authentication: Supabase Auth (Clerk descartado em ADR)
- AI Integration: Google Generative AI (Gemini)
- Multi-tenant: RLS enforcement + company_id filtering
- Testing: Vitest + React Testing Library (35% coverage)

**Componentes principais:**
- 20+ pages (Dashboard, Agenda, Finance, Reports, ClientCRM, etc.)
- 50+ reusable components
- Context API state management (AuthContext, AlertsContext, etc.)
- 6 storage buckets (Supabase Storage)

**Health Status:** 🟡 **YELLOW** (Generally Healthy, Opportunities for Improvement)
- Architecture: 95% ✅
- Database: 85% ✅
- Frontend: 80% ✅
- Security: 92% ✅
- Test Coverage: 35% ⚠️

---

## Orquestração de Squads

### Squad Matrix — Quem faz o quê

| Story | Lead | Especialidade | Parallelizável |
|-------|------|---------------|--|
| US-016 | @architect (Aria) | System Architecture | ✅ Fase 1 |
| US-017 | @data-engineer (Dara) | Database Schema Audit | ✅ Fase 1 |
| US-018 | @ux-design-expert (Uma) | Frontend Specification | ✅ Fase 1 |
| US-019 | @architect (Aria) | Technical Debt Draft | Fase 2 (input: 016-018) |
| US-020 | @data-engineer (Dara) | DB Specialist Review | Fase 2 (paralelo: 019) |
| US-021 | @ux-design-expert (Uma) | UX Specialist Review | Fase 2 (paralelo: 019) |
| US-022 | @qa (Quinn) | QA Gate + Verdict | Fase 3 (input: 020-021) |
| US-023 | @architect (Aria) | Final Assessment | Fase 3 (input: 022) |
| US-024 | @analyst (Alex) | Executive Report | Fase 4 (input: 023) |
| US-025 | @pm (Morgan) | Epic Generation | Fase 4 (input: 024) |

### Fluxo de Orquestração

```
[FASE 1 — Coleta de Dados] (1.5h paralelo)
  @architect (016)  ─┐
  @data-engineer    ├─→ [FASE 2 — Reviews] (3.5h)
  @ux-design-expert ─┘           ↓
                        @architect (019) ─┐
                        @data-engineer    ├─→ [FASE 3 — QA Gate] (1h)
                        @ux-design-expert ─┘       ↓
                                          @qa (022) ─→ VERDICT
                                                  ↓
                                          [FASE 4 — Finalizações] (2h)
                                          @architect (023) →
                                          @analyst (024) →
                                          @pm (025) → EPICS READY
```

### Responsabilidades por Agente

**@architect (Aria) — Lead Técnico**
- US-016: Mapear arquitetura completa (frontend, backend, integrations)
- US-019: Consolidar debt draft a partir dos 3 inputs
- US-023: Gerar avaliação final com roadmap de 12 semanas

**@data-engineer (Dara) — Especialista DB**
- US-017: Auditar schema, RLS, indexes, migrations
- US-020: Review técnico de database (normalization, query patterns, capacity)

**@ux-design-expert (Uma) — Especialista Frontend**
- US-018: Inventariar pages, components, design system, accessibility
- US-021: Review de frontend (performance, mobile, accessibility gaps)

**@qa (Quinn) — Quality Gate**
- US-022: Validar completude de reviews (7-point checklist)
- Decisão: APPROVED (prosseguir) ou NEEDS WORK (voltar para 019)

**@analyst (Alex) — Relatório Executivo**
- US-024: Traduzir findings técnicos para stakeholders (métricas, ROI, impacto)

**@pm (Morgan) — Orquestrador**
- US-025: Gerar 5-8 epics de technical debt + roadmap para backlog

---

## Critérios de Aceitação (Epic Level)

- [ ] Todas as 10 stories completadas com verdict APPROVED
- [ ] 10 documentos técnicos gerados (~270-420 KB total)
- [ ] QA Gate (US-022) = APPROVED (sem blockers)
- [ ] Relatório executivo (US-024) pronto para apresentação
- [ ] 5-8 epics criados em `docs/stories/` com priorização clara
- [ ] Próximas sprints podem começar com base nos epics gerados

---

## Arquivos Gerados (Deliverables)

| Story | Output | Tamanho | Status |
|-------|--------|--------|--------|
| US-016 | `system-architecture.md` | 30-40 KB | ✅ Pronto |
| US-017 | `SCHEMA.md` + `DB-AUDIT.md` | 50-70 KB | ✅ Pronto |
| US-018 | `frontend-spec.md` | 30-50 KB | ✅ Pronto |
| US-019 | `technical-debt-DRAFT.md` | 40-60 KB | 🔄 Pendente |
| US-020 | `db-specialist-review.md` | 10-15 KB | 🔄 Pendente |
| US-021 | `ux-specialist-review.md` | 10-15 KB | 🔄 Pendente |
| US-022 | `qa-review.md` + VERDICT | 5-10 KB | 🔄 Pendente |
| US-023 | `technical-debt-assessment.md` | 50-70 KB | 🔄 Pendente |
| US-024 | `TECHNICAL-DEBT-REPORT.md` | 20-30 KB | 🔄 Pendente |
| US-025 | 5-8 EPICS em `docs/stories/` | 15-20 KB | 🔄 Pendente |

---

## Definição de Pronto (Epic)

- ✅ Lint `npm run lint` passa
- ✅ TypeCheck `npm run typecheck` passa
- ✅ QA Gate (US-022) retorna APPROVED
- ✅ Todos os 10 documentos commitados
- ✅ Epics criados e prontos para sprint planning
- ✅ Relatório pode ser apresentado a stakeholders

---

## Notas Importantes

**Security Issues Conhecidas:**
- P0: RLS policy faltando em `client_semantic_memory` table
- P1: 5 missing database indexes (performance impact 20-30%)
- P1: N+1 query patterns detectados no frontend

**Performance Gaps:**
- Bundle size: ~150 KB gzipped (target <100 KB)
- Test coverage: 35% (target 70%)
- Mobile responsiveness: Gaps em modals

**Próximo Passo Após Épico:**
Executar wave 1 de development baseada nos epics gerados (prioridade P0/P1 items).

---

## Links Relacionados

- [PHASE_4_BROWNFIELD_PLAN.md](.agent/memory/PHASE_4_BROWNFIELD_PLAN.md)
- [EPIC-001: Transformação UX + AI](2026-03-07-EPIC-001-transformacao-ux-ai.md)
- [US-005: Integração AIOS](2026-02-28-US-005-aios-integration.md)
