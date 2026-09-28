-- Rollback de 20260928130000_booking_cancel_sync_lock_timeout.
-- Volta a função exatamente ao estado de prod após 20260925170000
-- (md5 de pg_get_functiondef = 6fcada5455bdc97472ccd9be5b846c51, proconfig
-- só com search_path). Não mexe em dados.
ALTER FUNCTION public.sync_public_booking_on_appointment_cancel() RESET lock_timeout;
