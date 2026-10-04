# Fin PR-D — Ciclo de comissão (PR #133) — estado final

Status: pronto para revisão; NÃO aplicado em produção. Migração: `supabase/migrations/20261004123000_commission_schedules.sql`; rollback: `docs/rollbacks/20261004123000_commission_schedules.rollback.sql`.

## Correções da revisão (sobre o trabalho do agente Cursor)
1. `_commission_prev_close` pulava para `effective_from - 1` após troca de regra (primeiro ciclo novo começava em data errada e podia recobrir período pago). Reescrito com `_commission_rule_transition` (next/prev close consistentes).
2. `commission_frequency_reset_backup` sem RLS → RLS + REVOKE de PUBLIC/anon/authenticated; só service_role.
3. Espelho de `commission_settlement_day_of_month` com dias 29–31 violava CHECK 1..28 de prod → só espelha mensal 1..28.
4. `generate_commission_reminders_v1`: `p_now` ignorado para authenticated (sem spoof); tenants sem staff ativa ignorados; lembretes de exceção só quando a regra do colaborador governa o fechamento.
5. Exceções por colaborador eram ignoradas no Pagamentos → `_commission_member_window`; `_commission_cycle_core` agrega cada membro na sua janela e expõe `own_cycle` só para quem tem exceção (paridade preservada para os demais).
6. `_commission_cycle_bounds` simplificado; `set_commission_schedule_v1` ignora anchor do cliente e retorna `first_new_close`; preview do servidor começa após o fim atual.
7. Checagens de dono via `get_auth_role()`; cron do pg_cron protegido por `pg_extension` + WARNING; link da notificação `/financeiro?tab=commissions`; rollback também remove os novos helpers e restaura `_commission_cycle_core` com md5 de prod (`b004cb3b…`).

## Testes
- `scripts/test-sql-commission-schedules.sh`: paridade JSON 24 meses (dias 1/5/28, 6570 chamadas) vs cópia congelada do core antigo; backfill; reset dos 8 + aviso; bounds semanal/quinzenal/mensal; clamp 29–31; DST Lisboa; effective_from = próximo fechamento; ciclo pago inalterado; ACL/RLS (anon negado, staff não escreve, cross-tenant negado); idempotência de lembretes; `--rollback` OK.
- Todos os `scripts/test-sql-*.sh` passam, exceto `test-sql-agenda-blocks-queue.sh` (falha conhecida, assinatura de `create_agenda_block`).
- typecheck, lint, vitest (200 arquivos / 1415 testes), build: OK. e2e `fin-d-commission-schedule.spec.ts`: 6/6.

## Pré-checagens em prod (somente leitura) antes de aplicar
- md5(`pg_get_functiondef`) de `_commission_cycle_core` = `b004cb3b0b79f14dbb9f7e1c5b12c4ec`, `_commission_settle_date` = `681ce9a791c976426c67e429eee52430`; `get_commission_cycle_v1` inalterado.
- Nenhuma outra função `_commission_*`; tabelas novas inexistentes.
- `business_settings`: 28 linhas (27×dia 5, 1×dia 1); CHECK 1..28 presente. Donos: 61 (34 sem business_settings).
- `team_members`: 7 quinzenal (2 tenants) + 1 semanal (1 tenant) = 8 a resetar.
- `pg_cron` não instalado (lembretes só via RPC ao abrir o app).
- `has_function_privilege('authenticated','public.get_auth_role()','EXECUTE')` = true.
- `notifications`: colunas esperadas e índice único parcial `(user_id, event_key) WHERE read=false AND event_key IS NOT NULL`.
- Default privileges do schema `public`.

## Riscos residuais
- Sem pg_cron, lembretes só aparecem quando o dono abre o app.
- Quinzenal valida 7 dias só dentro do mês; o intervalo na virada pode ser menor. Primeiro ciclo após troca pode ser bem curto.
- Rollback mantém notificações já geradas e o dia espelhado.
- `own_cycle` muda o intervalo exibido para membros com exceção; custo extra de consulta no core.
- Frontends antigos em cache continuam funcionando, mostrando "Acerto todo dia N".
- e2e é baseado em mocks; paridade provada localmente (dias 1/5/28), não com dados de prod.
- Banner do Início limitado a lembretes dos últimos 3 dias; aviso único vai para os 3 tenants afetados.
