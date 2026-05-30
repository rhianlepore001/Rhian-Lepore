# Fase 4 - Fila Digital

## Objetivo

Migrar o fluxo critico da fila digital para o paradigma funcional leve definido pelo Reversa: regras em `types/`, side effects em `services/`, mutations em `hooks/` e UI apenas orquestrando estado visual.

## Entregas

- `types/queue.ts`
  - Enum Zod dos estados da fila.
  - Schemas de entrada para entrar na fila, adicionar manualmente, atualizar status e finalizar atendimento.

- `services/queue.ts`
  - `joinQueue`: cria entrada publica com status `waiting` e bloqueia duplicata por telefone.
  - `addManualQueueEntry`: cria entrada manual usando o tenant do owner.
  - `updateQueueStatus`: atualiza status com filtro por `business_id`.
  - `resetExpiredCallingEntries`: volta `calling` para `waiting` apos 5 minutos sem marcar `no_show`.
  - `finishQueueEntry`: chama a RPC atomica `finish_queue_entry`.
  - `calcEstimatedWaitMinutes`: regra pura de posicao x 20 minutos.

- `hooks/useQueue.ts`
  - Mutations TanStack para entrada, adicao manual, status e finalizacao.

- `pages/QueueJoin.tsx`
  - Entrada publica passa a usar `joinQueue`.
  - Duplicata por telefone deixa de criar segunda entrada ativa.

- `pages/QueueManagement.tsx`
  - Adicao manual usa service.
  - Status usa service com filtro de tenant.
  - Timeout de `calling` e aplicado no refresh da fila.
  - Finalizacao saiu do componente e chama apenas RPC atomica.

- `supabase/migrations/20260530_finish_queue_entry_atomic.sql`
  - Adiciona `called_at` em `queue_entries`.
  - Cria `finish_queue_entry` com validacao de auth/tenant.
  - Executa em uma transacao no banco:
    - busca/cria cliente;
    - cria appointment `Completed`;
    - cria finance_record;
    - atualiza queue_entry para `completed`.

## Criterios Reversa cobertos

- BR-MIGRAR-027: estados tipados da fila.
- BR-MIGRAR-028: chamada continua disparando notificacao sonora no owner.
- BR-MIGRAR-029: finalizacao migrou para RPC atomica.
- BR-MIGRAR-030: filtro por dia atual preservado.
- BR-MIGRAR-031: tempo estimado preservado como posicao x 20 minutos.
- BR-MIGRAR-032: polling de 10s preservado em `QueueStatus`.
- BR-MIGRAR-033: rota continua sob guard de owner.
- BR-HUMANA-003: duplicata por telefone bloqueada.
- BR-HUMANA-004: timeout de 5 minutos volta para `waiting`, sem `no_show` automatico.

## Testes

- `test/services/queue.test.ts`
  - 10 testes cobrindo regra de tempo estimado, normalizacao de telefone, duplicata, entrada publica/manual, status, timeout e RPC atomica.

## Pendencias de validacao real

- Aplicar migration no Supabase real/staging.
- Validar fluxo completo com dois navegadores:
  - cliente entra pela URL publica;
  - owner chama;
  - cliente ve status `calling`;
  - timeout volta para `waiting`;
  - owner inicia atendimento;
  - owner finaliza e confirma appointment + finance_record.
