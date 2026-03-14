---
id: US-019
título: Rascunho de Technical Debt Consolidado
status: pending
estimativa: 1.5h
prioridade: high
agente: architect
assignee: "@architect"
blockedBy: [US-016, US-017, US-018]
epic: EPIC-002
---

# US-019: Rascunho de Technical Debt Consolidado

## Por Quê

Fases 4.1-4.3 geraram 3 documentos técnicos. Precisa consolidar em um único rascunho de debt, categorizando por:
- Criticidade (P0 = security, P1 = performance, P2 = quality)
- Esforço estimado
- Impacto no produto

Este rascunho alimenta as reviews especializadas (DB, UX, QA).

## O Que

Consolidar findings de 016-018 em categorias de debt:

1. **CRÍTICA (P0)**
   - Missing RLS policies (security vulnerability)
   - Unindexed columns causing N+1
   - Missing error handling in critical paths
   - Estimated effort: < 6h total

2. **ALTA (P1)**
   - Missing database indexes (5 items identified)
   - Legacy code patterns (Clerk migration remnants)
   - Performance bottlenecks (bundle size, N+1 queries)
   - Outdated dependencies
   - Estimated effort: 20-40h total

3. **MÉDIA (P2)**
   - Code duplication in components
   - Missing unit tests (coverage < 50%)
   - Accessibility gaps (WCAG 2.1)
   - Missing TypeScript strict modes
   - Inconsistent error messages
   - Estimated effort: 40-80h total

4. **BAIXA (P3)**
   - Code style inconsistencies
   - Missing documentation
   - Unused variables/imports
   - Design system refinements
   - Estimated effort: > 80h

## Critérios de Aceitação

- [ ] `docs/architecture/technical-debt-DRAFT.md` criado (500+ linhas)
- [ ] Consolidação clara de 016-018 findings
- [ ] Cada item de debt tem: [ID] [Category] [Impact] [Effort] [Description]
- [ ] P0 items priorizados (< 6h)
- [ ] P1 items mapeados (< 40h)
- [ ] Total debt estimado em horas
- [ ] Roadmap esqueleto (12 semanas)
- [ ] Arquivo pronto para ser consumido por reviews

## Arquivos Impactados

**Novos:**
- `docs/architecture/technical-debt-DRAFT.md` (criar)

**Referenciados:**
- `docs/architecture/system-architecture.md` (output de US-016)
- `docs/architecture/SCHEMA.md` (output de US-017)
- `docs/architecture/DB-AUDIT.md` (output de US-017)
- `docs/architecture/frontend-spec.md` (output de US-018)

## Progresso Atual

- [ ] 0% — Bloqueado por US-016, US-017, US-018

## Definição de Pronto

- [ ] `technical-debt-DRAFT.md` criado
- [ ] Consolidação é clara e legível
- [ ] P0/P1/P2 items estão priorizados
- [ ] Próximas reviews (US-020, US-021) conseguem ler e criticar

## Notas

**Referência canônica:** `.agent/memory/PHASE_4_BROWNFIELD_PLAN.md` → Fase 4.4

**Input bloqueante:** US-016, US-017, US-018 devem estar completos

**Próximo:** Output vai alimentar US-020 (DB Review), US-021 (UX Review), US-022 (QA Gate)
