-- ROLLBACK de 20261003150000_reschedule_appointment
-- Só remove o que este PR adicionou. Funções existentes não são tocadas.

BEGIN;

DROP FUNCTION IF EXISTS public.reschedule_appointment(uuid, timestamp with time zone, uuid);
DROP TABLE IF EXISTS public.appointment_reschedules;

COMMIT;
