# SPEC: Atrasados, quinzenal e lembretes de comissão

**Status:** ready
**Criado:** 2026-09-06
**Prioridade:** alta

---

## O que o cliente final vê

1. Na Agenda (filtro atrasados), **Faturar** conclui o agendamento e gera o lançamento financeiro — sem toast de erro.
2. Em Equipe e Comissões, dá para salvar **Quinzenal** (ex.: dias 7 e 22).
3. Mudar só o dia/frequência de um colaborador salva sem o aviso de recálculo. Mudar a % atualiza as comissões pendentes.
4. Lembrete **universal** (um dia do mês para todo mundo) é opcional:
   - ligado → frequência/dia de cada colaborador ficam travados; o dashboard avisa nesse dia;
   - desligado → cada um usa semanal/quinzenal/mensal e recebe o próprio lembrete.

## O que muda no sistema

- Constraint `team_members.commission_payment_frequency` passa a aceitar `biweekly`.
- RPC `recalculate_pending_commissions` deixa de referenciar `finance_records.deleted_at` (coluna inexistente).
- Remove overload `complete_appointment(uuid)` (conflito PostgREST PGRST203 com a assinatura de 7 args).
- Coluna `business_settings.commission_universal_reminder_enabled`.

## O que NÃO muda

- Cálculo do período em Financeiro → Comissões.
- Checkout da grade da Agenda (Confirmar e cobrar).
- RLS e isolamento por tenant.

## Edge cases

- Dono não entra na fila de lembrete/repasse.
- Sem comissão pendente → sem lembrete.
- Fevereiro: dia 30 quinzenal usa o último dia do mês.
- Clique duplo em Faturar não dispara duas RPCs.

## Done when

- [x] Faturar atrasado conclui sem erro
- [x] Quinzenal salva
- [x] Recálculo não quebra ao mudar data
- [x] Lembrete por colaborador + universal opcional com trava
- [x] Testes de código e checagens de segurança no banco
