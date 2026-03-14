---
id: US-017
título: Auditoria Completa do Schema de Database
status: pending
estimativa: 2h
prioridade: high
agente: data-engineer
assignee: "@data-engineer"
blockedBy: []
epic: EPIC-002
---

# US-017: Auditoria Completa do Schema de Database

## Por Quê

O projeto tem 27 tabelas + 41 RPCs + RLS policies. Não há visibilidade sobre:
- Quais tabelas têm RLS enabled?
- Quais índices estão faltando (performance)?
- Foreign key relationships são válidas?
- Storage está dentro de capacity?
- Há políticas RLS duplicadas ou conflitantes?

Auditar schema = identificar vulnerabilidades e gargalos de performance.

## O Que

Executar auditoria técnica completa do PostgreSQL:

1. **Schema Inventory**
   - Listar todas as 19 tabelas + audit tables
   - Documentar todas as colunas por tabela
   - Listar primary/foreign keys

2. **RLS Audit**
   - Verificar se RLS está ENABLED em todas as tabelas
   - Documentar todas as RLS policies
   - Identificar gaps ou conflitos

3. **RPC Functions**
   - Contar todas as 41+ RPCs
   - Verificar se todas têm SECURITY DEFINER
   - Documentar parâmetros e return types

4. **Index Analysis**
   - Listar índices existentes
   - Identificar índices faltando (N+1 patterns)
   - Avaliar impact de missing indexes

5. **Storage & Capacity**
   - Tamanho de cada tabela
   - Crescimento esperado (6 meses, 1 ano)
   - Capacity planning

6. **Data Integrity**
   - Foreign key validation (orphans?)
   - Constraint violations
   - Null checks

## Critérios de Aceitação

- [ ] `docs/architecture/SCHEMA.md` criado com inventory completo (27 tabelas + 8 audit)
- [ ] `docs/architecture/DB-AUDIT.md` criado com findings de auditoria
- [ ] Todas as 27 tabelas documentadas (columns, types, constraints)
- [ ] RLS status verificado (✅ ou ❌ por tabela)
- [ ] Todas as 41+ RPCs listadas com SECURITY DEFINER status
- [ ] Missing indexes identificados com impact assessment
- [ ] Storage breakdown documentado (table sizes, growth projection)
- [ ] Foreign key relationships validadas
- [ ] Vulnerability list priorizada (P0/P1/P2)

## Arquivos Impactados

**Novos:**
- `docs/architecture/SCHEMA.md` (criar)
- `docs/architecture/DB-AUDIT.md` (criar)

**Referenciados (read-only):**
- `supabase/migrations/` (todas as migrations)
- Supabase dashboard (RLS policies, functions)

## Progresso Atual

- [ ] 0% — Não iniciado

## Definição de Pronto

- [ ] `SCHEMA.md` criado com inventory completo
- [ ] `DB-AUDIT.md` criado com vulnerability list
- [ ] P0/P1 issues documentadas e priorizadas
- [ ] Arquivos têm exemplos de SQL ou queries usadas
- [ ] Nenhuma tabela está sem documentação

## Notas

**Referência canônica:** `.agent/memory/PHASE_4_BROWNFIELD_PLAN.md` → Fase 4.2

**Ferramentas:** Supabase CLI, PostgreSQL queries (listadas em plano)

**Próximo:** Output alimenta US-019 e US-020
