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

- [ ] Nova página/seção `FinanceDoctor.tsx` com card de diagnóstico financeiro
- [ ] Integração com `lib/gemini.ts` para prompts de análise financeira
- [ ] Hook `useFinanceInsights` que coleta dados e chama Gemini
- [ ] Componente `FinanceDoctorCard.tsx` com layout de insights
- [ ] Testes: Validar que insights são gerados e exibidos corretamente
- [ ] Validação manual: Abrir Finance, ver card do Doutor com diagnóstico
- [ ] RLS verificada: Insights só mostram dados da empresa logada

## Arquivos Impactados

- `pages/Finance.tsx` (integrar card)
- `components/FinanceDoctorCard.tsx` (novo)
- `hooks/useFinanceInsights.ts` (novo)
- `lib/gemini.ts` (adicionar função de análise financeira)
- `supabase/migrations/` (se necessário índices em transactions)

## Progresso Atual

- ✅ `lib/gemini.ts` com suporte a Gemini API
- 🔄 `components/BrutalCard.tsx` em ajuste visual
- 🔄 `pages/Finance.tsx` sendo refatorada para aceitar o módulo
- ⏳ Hook `useFinanceInsights` não iniciado

## Definição de Pronto

- [ ] Lint: `npm run lint` sem erros
- [ ] Typecheck: `npm run typecheck` sem erros
- [ ] Teste manual: Abrir Finance, ver diagnóstico em tempo real
- [ ] RLS: Verificado que multi-tenant está isolado
- [ ] Deploy: Feature visível em staging
