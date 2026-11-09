-- Executar somente após avaliar a perda dos custos e tempos registrados pela funcionalidade.
DROP FUNCTION IF EXISTS public.get_chair_hour_v1(date,uuid,date);
DROP FUNCTION IF EXISTS public.complete_appointment_with_duration(uuid,text,uuid,uuid,numeric,numeric,numeric,integer);
DROP FUNCTION IF EXISTS public.settle_queue_ticket_with_duration(uuid,text,numeric,uuid,text,integer);
DROP TRIGGER IF EXISTS chair_hour_guard_working_hours ON public.team_members;
DROP FUNCTION IF EXISTS public.chair_hour_guard_working_hours();
DROP TABLE IF EXISTS public.fixed_costs;
DROP TABLE IF EXISTS public.service_costs;
DROP TABLE IF EXISTS public.chair_hour_settings;
DROP FUNCTION IF EXISTS public.chair_hour_guard_cost_history();
DROP FUNCTION IF EXISTS public.chair_hour_validate_owner_reference();
ALTER TABLE public.team_members DROP COLUMN IF EXISTS working_hours;
ALTER TABLE public.appointments DROP COLUMN IF EXISTS actual_duration_minutes;
