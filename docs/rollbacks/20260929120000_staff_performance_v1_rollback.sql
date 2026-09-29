-- Rollback de 20260929120000_staff_performance_v1.sql (só remove o que a migration criou).
-- Nenhuma função existente foi alterada pela migration, então não há o que restaurar.
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP FUNCTION IF EXISTS public.get_commission_cycle_v1(date);
DROP FUNCTION IF EXISTS public.get_staff_performance_v1(date, date, uuid, boolean);
DROP FUNCTION IF EXISTS public._commission_cycle_core(text, date, timestamptz);
DROP FUNCTION IF EXISTS public._commission_settle_date(date, int);
DROP FUNCTION IF EXISTS public._staff_performance_core(text, date, date, uuid, boolean, timestamptz, boolean);
DROP FUNCTION IF EXISTS public._staff_perf_raw(text, timestamptz, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public._staff_perf_tz(text);
DROP INDEX IF EXISTS public.idx_appointments_user_client_time;
COMMIT;
