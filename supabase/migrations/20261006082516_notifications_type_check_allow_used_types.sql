-- Sino: libera os tipos de notificação que o código já grava (allow-list estrita).
--
-- Causa: notifications_type_check só aceitava info/warning/success/danger. Mas:
--   - notify_booking_recipients -> upsert_booking_notification (PR-7, 20261004112214)
--     grava type = 'new' (novo pedido) e 'edit' (pedido de alteração);
--   - _commission_emit_reminder (20261004182606) grava type = 'commission_reminder'.
-- Todo INSERT falhava com 23514. No trigger de public_bookings o erro era engolido
-- (RAISE WARNING) e nos lembretes de comissão o cliente ignorava o erro -> em prod
-- public.notifications tinha 0 linhas e o sino nunca recebia nada.
--
-- Correção: troca o CHECK por um superconjunto (4 tipos antigos + os 3 usados).
-- Continua uma allow-list: qualquer outro valor segue rejeitado. NULL continua
-- aceito como antes (CHECK com NULL passa; a coluna tem DEFAULT 'info').
-- Nada mais muda: RLS, grants, FK, índices, funções e trigger intactos.
-- Rollback: docs/rollbacks/20261006082516_notifications_type_check_allow_used_types.rollback.sql

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK ((type = ANY (ARRAY[
    'info'::text, 'warning'::text, 'success'::text, 'danger'::text,
    'new'::text, 'edit'::text, 'commission_reminder'::text
  ])));
