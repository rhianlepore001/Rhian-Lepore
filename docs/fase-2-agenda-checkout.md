# Fase 2 -- Agenda + Checkout

## Objetivo

Migrar o fluxo critico de checkout para o contrato alvo do Reversa: camada de tipos, service/hook de Scheduling e conclusao de atendimento via RPC atomica, sem fallback client-side `UPDATE appointments` + `INSERT finance_records`.

## Entregue nesta etapa

- `types/scheduling.ts`
  - Schemas Zod para status de agendamento, metodo de pagamento, checkout, taxa de maquininha e criacao de agendamento.
- `services/scheduling.ts`
  - Funcoes puras de taxa de maquininha e valor liquido.
  - `completeAppointment()` chamando somente RPC `complete_appointment`.
  - `createAppointment()` preparado para `create_secure_booking`.
- `hooks/useScheduling.ts`
  - `useCheckout()` e `useCreateAppointment()` com TanStack Query.
- `index.tsx`
  - `QueryClientProvider` global para habilitar hooks TanStack.
- `components/AppointmentWizard.tsx`
  - Criacao de agendamento passou a usar `useCreateAppointment()`.
  - A RPC `create_secure_booking` ficou encapsulada em `services/scheduling.ts`.
  - O wizard preserva comportamento atual: colisao retorna mensagem, sucesso dispara eventos e notificacao WhatsApp.
- `components/CheckoutModal.tsx`
  - Checkout passou a usar `useCheckout()`.
  - Preco final agora vai para a RPC como `p_final_price`.
  - Removido `UPDATE appointments` separado antes da RPC.
  - Em falha da RPC, o cliente ve erro e o app nao executa fallback parcial.
- `pages/Agenda.tsx`
  - Removido fallback client-side de conclusao que criava risco de inconsistencia entre appointment e finance record.
- `supabase/migrations/20260530_complete_appointment_atomic_price.sql`
  - Nova versao da RPC `complete_appointment` com `p_final_price`.
  - Valida usuario autenticado, tenant via `get_auth_company_id()`, bloqueia preco negativo e taxa maior que o valor.
  - Atualiza appointment e cria/atualiza finance_record dentro da mesma funcao.

## Testes adicionados/reforcados

- `components/CheckoutModal.test.tsx`
  - Garante validacao de forma de pagamento.
  - Garante exibicao condicional de taxa para debito/credito.
  - Garante chamada da RPC com `p_final_price`.
  - Garante ausencia de fallback client-side em erro da RPC.
- `test/services/scheduling.test.ts`
  - Cobre calculo de taxa de maquininha.
  - Cobre valor liquido.
  - Cobre chamada da RPC atomica.
  - Cobre propagacao de erro da RPC.
  - Cobre normalizacao do payload de criacao de agendamento para `create_secure_booking`.

## Fora de escopo ainda pendente na Fase 2

- Teste E2E real de agenda com Supabase.
- Validacao manual em banco real da nova migration.
- Revisao visual profunda da tela de Agenda.

## Criterio CTO

Esta etapa reduz o risco principal G3: o checkout nao deve mais finalizar parcialmente no cliente quando a RPC falha. Tambem move a criacao de agendamento para o contrato alvo `service/hook`. A conclusao completa da Fase 2 ainda depende de validar o fluxo end-to-end em Supabase real e aplicar/testar a migration.
