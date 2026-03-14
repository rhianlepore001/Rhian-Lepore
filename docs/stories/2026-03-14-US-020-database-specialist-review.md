---
id: US-020
título: Review Especializada de Database
status: pending
estimativa: 1h
prioridade: high
agente: data-engineer
assignee: "@data-engineer"
blockedBy: [US-019]
epic: EPIC-002
---

# US-020: Review Especializada de Database

## Por Quê

O technical debt draft (US-019) precisa de especialização por área. Este story foca em database:
- Schema normalization (3NF?)
- Query optimization opportunities
- Missing indexes impact
- RLS policy completeness
- Migration order/dependencies
- Data integrity constraints
- Backup/recovery strategy

Especialista DB valida technical debt e fornece recomendações técnicas específicas.

## O Que

Review especializada focada em database:

1. **Schema Normalization**
   - Verificar se schema está em 3NF
   - Identificar denormalizações justificadas
   - Propor refatorações se necessário

2. **Query Optimization**
   - Analisar padrões de query do draft
   - Identificar N+1 patterns
   - Propor índices e reorganizações
   - Avaliar query plans lento

3. **RLS Completeness**
   - Validar policies são sufficient
   - Identificar gaps na isolation
   - Propor policies faltando

4. **Migration Strategy**
   - Documentar ordem de aplicação de mudanças
   - Identificar dependencies
   - Propor rollback strategies

5. **Performance Impact**
   - Estimar improvement de cada fix
   - Priorizar por ROI

## Critérios de Aceitação

- [ ] `docs/architecture/db-specialist-review.md` criado (200+ linhas)
- [ ] Schema normalization status documentado
- [ ] Query optimization opportunities listadas (com SQL examples)
- [ ] Missing indexes documentados com impact %
- [ ] RLS policy gaps identificados
- [ ] Migration order proposta (com dependencies)
- [ ] Data integrity checks recomendados
- [ ] Performance improvement estimates calculados

## Arquivos Impactados

**Novos:**
- `docs/architecture/db-specialist-review.md` (criar)

**Referenciados:**
- `docs/architecture/technical-debt-DRAFT.md` (input: US-019)
- `docs/architecture/SCHEMA.md` (referência: US-017)
- `docs/architecture/DB-AUDIT.md` (referência: US-017)

## Progresso Atual

- [ ] 0% — Bloqueado por US-019

## Definição de Pronto

- [ ] `db-specialist-review.md` criado
- [ ] Todas as recomendações têm exemplos técnicos
- [ ] Priorização clara (P0/P1/P2)
- [ ] Arquivo pode ser apresentado a @qa (US-022) como input para verdict

## Notas

**Referência canônica:** `.agent/memory/PHASE_4_BROWNFIELD_PLAN.md` → Fase 4.5

**Input bloqueante:** US-019

**Paralelo:** US-021 (UX Review) roda simultaneamente

**Próximo:** Output alimenta US-022 (QA Gate)
