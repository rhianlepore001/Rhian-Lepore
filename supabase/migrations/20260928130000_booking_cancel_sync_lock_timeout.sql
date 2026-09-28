-- Review do #98 (N3): o trigger de sync (20260925170000_booking_cancel_sync)
-- faz UPDATE em public_bookings dentro do cancelamento do agendamento. Se a
-- linha do pedido estiver travada por outra transação, a espera não pode
-- segurar (nem derrubar) o cancelamento: com lock_timeout a espera vira erro
-- 55P03 DENTRO do bloco EXCEPTION da função (RAISE WARNING) e o agendamento
-- é cancelado normalmente; só o sync do pedido fica para trás.
-- Aditivo: só a configuração da função muda (corpo e ACL iguais).
-- Rollback: docs/rollbacks/20260928130000_booking_cancel_sync_lock_timeout_rollback.sql
ALTER FUNCTION public.sync_public_booking_on_appointment_cancel() SET lock_timeout = '2s';
