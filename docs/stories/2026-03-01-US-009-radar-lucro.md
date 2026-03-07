---
id: US-009
título: Radar de Lucro (Churn Detection)
status: pending
estimativa: 4h
prioridade: high
agente: backend-specialist
assignee: "@backend-specialist"
blockedBy: []
---

# US-009: Radar de Lucro (Churn Detection)

## Por Quê
Identificar clientes que não retornam há mais de 30 dias é a forma mais barata de recuperar receita. O sistema deve automatizar essa identificação.

## O Que
1. Criar lógica (RPC ou Hook) para filtrar clientes com `last_visit > 30 dias`.
2. Integrar com a tabela `clients`.
3. Exibir lista de clientes "em risco" no Dashboard ou seção Marketing.

## Critérios de Aceitação
- [ ] Função de detecção de churn funcional
- [ ] Listagem de clientes inativos na UI
- [ ] Cálculo de "Receita Recuperável" baseada no ticket médio do cliente
- [ ] RLS validada

## Arquivos Impactados
- `hooks/useAIOSDiagnostic.ts`
- `pages/Marketing.tsx`
- `supabase/migrations/` (RPC de extração)

## Definição de Pronto
- [ ] Teste manual: Clientes inativos aparecem na lista
- [ ] Lint & Typecheck: OK
