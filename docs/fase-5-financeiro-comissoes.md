# Fase 5 - Financeiro e Comissoes

## Objetivo

Migrar os pontos criticos do financeiro para contratos mais seguros, principalmente o acesso de staff. O criterio central da fase e: colaborador ve apenas registros vinculados ao seu `professional_id`, nunca por nome exibido.

## Entregas

- `types/finance.ts`
  - Tipos de transacao financeira, resumo e inputs do service.

- `services/finance.ts`
  - `fetchFinanceStats`: chama `get_finance_stats` com `p_professional_id` opcional.
  - `mapFinanceTransaction`: normaliza payload da RPC mantendo `professionalId`.
  - `filterStaffTransactions`: filtra staff por `professionalId`.
  - `calcCommission`: calcula base e valor de comissao com/sem taxa de maquininha.
  - `calcSettlementDate`: usa ultimo dia do mes quando o dia configurado nao existe.

- `hooks/useFinance.ts`
  - Mutation TanStack para estatisticas financeiras.

- `pages/Finance.tsx`
  - Staff deixa de filtrar transacoes por `professionalName === fullName`.
  - Staff passa a usar `teamMemberId`.
  - Abas restritas continuam indisponiveis para staff.

- `supabase/migrations/20260530_finance_stats_professional_filter.sql`
  - Atualiza `get_finance_stats` com `p_professional_id` opcional.
  - Valida tenant autenticado via `get_auth_company_id`.
  - Retorna `professional_id` nas transacoes.
  - Aplica filtro por profissional em receitas, despesas, comissoes, graficos e transacoes.

## Criterios Reversa cobertos

- BR-MIGRAR-034: staff filtra por `professional_id`, nunca por nome.
- BR-MIGRAR-035: staff nao ve abas de Comissoes, Historico e Insights.
- BR-MIGRAR-036: dia de acerto inexistente cai no ultimo dia do mes.
- BR-MIGRAR-037: comissao considera base com/sem taxa de maquininha.
- BR-MIGRAR-038: fluxo de pagamento de comissoes continua via RPC `mark_commissions_as_paid`.
- BR-MIGRAR-039: transacao manual sem appointment preservada.
- BR-MIGRAR-040: delecao de receita automatica continua removendo appointment vinculado.
- BR-MIGRAR-043: exportacao CSV preservada.
- BR-MIGRAR-046: moeda/metodos BR/PT preservados.

## Testes

- `test/services/finance.test.ts`
  - 6 testes cobrindo comissao, dia de acerto, chamada da RPC com `professional_id`, mapeamento de transacao e filtro de staff por ID.

## Pendencias de validacao real

- Aplicar migration em staging.
- Entrar com conta staff vinculada a `team_members`.
- Confirmar que `/financeiro` exibe apenas atendimentos do `teamMemberId`.
- Confirmar que staff nao acessa Comissoes, Historico e Insights por troca manual de aba/URL.
