---
id: US-004
título: Módulo Doutor Financeiro (Finance Doctor)
status: in-progress
estimativa: 8h
prioridade: high
agente: frontend-specialist
assignee: "@frontend-specialist"
blockedBy: []
---

# US-004: Módulo Doutor Financeiro (Finance Doctor)

## Por Quê

Os proprietários de salões/barbearias precisam de análises automáticas sobre sua saúde financeira. Atualmente, o módulo Finance é apenas visualização de dados brutos. O Finance Doctor usa IA (Gemini) para gerar insights inteligentes: alertas de fluxo de caixa, padrões de receita, recomendações de otimização.

## O Que

Implementar um sistema que:
1. Coleta dados financeiros (transações, receitas, despesas) via Supabase.
2. Envia contexto financeiro para o Gemini API.
3. Recebe análises estruturadas (diagnóstico, recomendações, alertas críticos).
4. Renderiza cards visuais no módulo Finance com insights e ações recomendadas.

## Critérios de Aceitação

- [x] Hook `useFinanceInsights` criado (Verificado no histórico)
- [x] Integração com `lib/gemini.ts` feita
- [ ] Component `FinanceDoctorCard.tsx` renderiza corretamente
- [ ] Teste manual: insights aparecem na página Finance
- [ ] RLS validada (só mostra dados da empresa logada)
- [ ] Lint passa
- [ ] Typecheck passa

## Arquivos Impactados

- `pages/Finance.tsx` (integrar card)
- `components/FinanceDoctorCard.tsx` (novo)
- `hooks/useFinanceInsights.ts` (novo)
- `lib/gemini.ts` (adicionar função de análise financeira)

## Progresso Atual

- **Status:** 75% concluído
- ✅ `lib/gemini.ts` com suporte a Gemini API
- ✅ Hook `useFinanceInsights` implementado
- 🔄 `FinanceDoctorCard.tsx` em desenvolvimento visual
- 🔄 Integração na `pages/Finance.tsx` pendente de refinamento

## Definição de Pronto

- [ ] Lint: OK
- [ ] Typecheck: OK
- [ ] Teste manual: OK
- [ ] RLS: Verificado multi-tenant
- [ ] Deploy: Staging
