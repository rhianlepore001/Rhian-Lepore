# Fase 3 -- Booking Publico

## Objetivo

Comecar a migracao do fluxo de agendamento publico para o contrato alvo do Reversa: tipos, service/hook por dominio e regras de paridade explicitas para duplicata por telefone e edicao de booking.

## Entregue nesta etapa

- `types/publicBooking.ts`
  - Schemas Zod para status, registro de booking publico e input de submit.
- `services/publicBooking.ts`
  - `getActiveBookingByPhone()` encapsula RPC `get_active_booking_by_phone`.
  - `submitPublicBooking()` centraliza criacao e edicao de `public_bookings`.
  - `createAcceptedAppointmentFromBooking()` centraliza a criacao do appointment ao aceitar booking.
  - `confirmPublicBooking()` e `rejectPublicBooking()` centralizam mudanca de status por tenant.
- `hooks/usePublicBooking.ts`
  - `useSubmitPublicBooking()` e `useFindActivePublicBooking()` preparados com TanStack Query.
- `pages/PublicBooking.tsx`
  - Busca de booking ativo por telefone passou pelo service.
  - Criacao/edicao de booking passou pelo service.
  - Duplicata por telefone continua bloqueando novo booking e exibindo o booking ativo.
- `pages/Agenda.tsx`
  - Aceite de booking editado agora faz `INSERT` de novo appointment.
  - O appointment original nao e mais atualizado, preservando historico conforme decisao Reversa BR-HUMANA-005/008.
  - Confirmacao/rejeicao de booking e criacao de appointment aceito passaram pelo service.

## Testes adicionados

- `test/services/publicBooking.test.ts`
  - Busca booking ativo por telefone via RPC.
  - Cria booking publico com status `pending`.
  - Edita booking preservando `original_appointment_time` e marcando `is_edit`.
  - Cria appointment aceito sem atualizar historico original.
  - Confirma/rejeita booking pelo tenant do negocio.

## Fora de escopo ainda pendente na Fase 3

- Teste E2E real do fluxo `/book/:slug`.
- Validacao manual com cliente anonimo e owner autenticado.
- UX polish do booking publico mobile.

## Criterio CTO

Esta etapa corrige a regra mais sensivel de edicao: o sistema nao deve sobrescrever historico de appointment. A Fase 3 ainda precisa de validacao E2E/manual do fluxo anonimo + owner para ser considerada concluida em producao.
