-- Custos e duração: estruturas aditivas; nenhuma despesa existente é alterada.
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS working_hours jsonb;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS actual_duration_minutes integer;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.appointments'::regclass AND conname='appointments_actual_duration_minutes_check') THEN
    ALTER TABLE public.appointments ADD CONSTRAINT appointments_actual_duration_minutes_check CHECK (actual_duration_minutes IS NULL OR actual_duration_minutes BETWEEN 1 AND 1440);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.chair_hour_guard_working_hours() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 IF ((TG_OP='INSERT' AND NEW.working_hours IS NOT NULL) OR (TG_OP='UPDATE' AND NEW.working_hours IS DISTINCT FROM OLD.working_hours)) AND auth.uid() IS NOT NULL
    AND (public.get_auth_role() IS DISTINCT FROM 'owner' OR NEW.user_id::text IS DISTINCT FROM public.get_auth_company_id()) THEN
   RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.chair_hour_guard_working_hours() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS chair_hour_guard_working_hours ON public.team_members;
CREATE TRIGGER chair_hour_guard_working_hours BEFORE INSERT OR UPDATE OF working_hours ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.chair_hour_guard_working_hours();

CREATE TABLE IF NOT EXISTS public.fixed_costs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id text NOT NULL,
 professional_id uuid REFERENCES public.team_members(id), category text NOT NULL,
 description text NOT NULL, amount numeric(12,2) NOT NULL CHECK (amount >= 0),
 start_date date NOT NULL, end_date date CHECK (end_date IS NULL OR end_date >= start_date),
 is_owner_salary boolean NOT NULL DEFAULT false, active boolean NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.service_costs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id text NOT NULL,
 service_id uuid NOT NULL REFERENCES public.services(id), amount numeric(12,2) NOT NULL CHECK (amount >= 0),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id, service_id)
);
CREATE TABLE IF NOT EXISTS public.chair_hour_settings (
 company_id text PRIMARY KEY, low_margin_pct numeric(5,2) NOT NULL DEFAULT 20 CHECK (low_margin_pct BETWEEN 0 AND 100)
);
CREATE INDEX IF NOT EXISTS fixed_costs_company_dates_idx ON public.fixed_costs (company_id, start_date, end_date);
ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chair_hour_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fixed_costs_owner ON public.fixed_costs;
CREATE POLICY fixed_costs_owner ON public.fixed_costs FOR ALL TO authenticated
 USING (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner')
 WITH CHECK (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner');
DROP POLICY IF EXISTS service_costs_owner ON public.service_costs;
CREATE POLICY service_costs_owner ON public.service_costs FOR ALL TO authenticated
 USING (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner')
 WITH CHECK (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner');
DROP POLICY IF EXISTS chair_hour_settings_owner ON public.chair_hour_settings;
CREATE POLICY chair_hour_settings_owner ON public.chair_hour_settings FOR ALL TO authenticated
 USING (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner')
 WITH CHECK (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fixed_costs, public.service_costs, public.chair_hour_settings TO authenticated;
REVOKE ALL ON public.fixed_costs, public.service_costs, public.chair_hour_settings FROM anon;

CREATE OR REPLACE FUNCTION public.chair_hour_validate_owner_reference() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 IF NEW.company_id IS DISTINCT FROM public.get_auth_company_id() OR public.get_auth_role() IS DISTINCT FROM 'owner' THEN
   RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501';
 END IF;
 IF TG_TABLE_NAME = 'fixed_costs' THEN
   IF TG_OP = 'INSERT' AND NEW.active IS NULL THEN NEW.active := NOT NEW.is_owner_salary; END IF;
   IF NEW.professional_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.team_members t WHERE t.id=NEW.professional_id AND t.user_id::text=NEW.company_id) THEN
     RAISE EXCEPTION 'invalid_professional' USING ERRCODE='23503';
   END IF;
 ELSE
   IF NOT EXISTS (SELECT 1 FROM public.services s WHERE s.id=NEW.service_id AND s.user_id::text=NEW.company_id) THEN
     RAISE EXCEPTION 'invalid_service' USING ERRCODE='23503';
   END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.chair_hour_validate_owner_reference() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS chair_hour_validate_fixed_reference ON public.fixed_costs;
CREATE TRIGGER chair_hour_validate_fixed_reference BEFORE INSERT OR UPDATE ON public.fixed_costs FOR EACH ROW EXECUTE FUNCTION public.chair_hour_validate_owner_reference();
DROP TRIGGER IF EXISTS chair_hour_validate_service_reference ON public.service_costs;
CREATE TRIGGER chair_hour_validate_service_reference BEFORE INSERT OR UPDATE ON public.service_costs FOR EACH ROW EXECUTE FUNCTION public.chair_hour_validate_owner_reference();

CREATE OR REPLACE FUNCTION public.chair_hour_guard_cost_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_timezone text; v_today date;
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'cost_history_immutable' USING ERRCODE='42501'; END IF;
 SELECT COALESCE(bs.timezone, CASE WHEN p.region='PT' THEN 'Europe/Lisbon' ELSE 'America/Sao_Paulo' END)
 INTO v_timezone FROM public.profiles p LEFT JOIN public.business_settings bs ON bs.user_id::text=OLD.company_id WHERE p.id=OLD.company_id LIMIT 1;
 IF v_timezone IS NULL OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name=v_timezone) THEN v_timezone := 'UTC'; END IF;
 v_today := (now() AT TIME ZONE v_timezone)::date;
 IF (to_jsonb(NEW)-'end_date') IS DISTINCT FROM (to_jsonb(OLD)-'end_date')
    OR (OLD.end_date IS NOT NULL AND OLD.end_date < v_today AND NEW.end_date IS DISTINCT FROM OLD.end_date)
    OR (NEW.end_date IS DISTINCT FROM OLD.end_date AND (NEW.end_date IS NULL OR NEW.end_date < v_today)) THEN
   RAISE EXCEPTION 'cost_history_immutable' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.chair_hour_guard_cost_history() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS chair_hour_guard_cost_history ON public.fixed_costs;
CREATE TRIGGER chair_hour_guard_cost_history BEFORE UPDATE OR DELETE ON public.fixed_costs FOR EACH ROW EXECUTE FUNCTION public.chair_hour_guard_cost_history();

CREATE OR REPLACE FUNCTION public.complete_appointment_with_duration(
 p_appointment_id uuid, p_payment_method text DEFAULT NULL, p_received_by uuid DEFAULT NULL,
 p_completed_by uuid DEFAULT NULL, p_machine_fee_percent numeric DEFAULT 0,
 p_machine_fee_amount numeric DEFAULT 0, p_final_price numeric DEFAULT NULL,
 p_actual_duration_minutes integer DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_company text := public.get_auth_company_id(); v_status text;
BEGIN
 IF auth.uid() IS NULL OR v_company IS NULL OR COALESCE(public.get_auth_role(),'') NOT IN ('owner','staff') THEN
   RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501';
 END IF;
 IF p_actual_duration_minutes IS NOT NULL AND p_actual_duration_minutes NOT BETWEEN 1 AND 1440 THEN
   RAISE EXCEPTION 'invalid_duration' USING ERRCODE='22023';
 END IF;
 IF (p_received_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.team_members t WHERE t.id=p_received_by AND t.user_id::text=v_company AND t.deleted_at IS NULL))
    OR (p_completed_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.team_members t WHERE t.id=p_completed_by AND t.user_id::text=v_company AND t.deleted_at IS NULL)) THEN
   RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501';
 END IF;
 SELECT a.status INTO v_status FROM public.appointments a WHERE a.id=p_appointment_id AND a.user_id::text=v_company FOR UPDATE;
 IF NOT FOUND THEN
   RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501';
 END IF;
 IF v_status = 'Completed' THEN RETURN; END IF;
 PERFORM public.complete_appointment(p_appointment_id,p_payment_method,p_received_by,p_completed_by,p_machine_fee_percent,p_machine_fee_amount,p_final_price);
 UPDATE public.appointments SET actual_duration_minutes=p_actual_duration_minutes WHERE id=p_appointment_id AND user_id::text=v_company;
END $$;
REVOKE ALL ON FUNCTION public.complete_appointment_with_duration(uuid,text,uuid,uuid,numeric,numeric,numeric,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_appointment_with_duration(uuid,text,uuid,uuid,numeric,numeric,numeric,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.settle_queue_ticket_with_duration(
 p_entry_id uuid, p_service_name text DEFAULT NULL, p_final_price numeric DEFAULT NULL,
 p_professional_id uuid DEFAULT NULL, p_payment_method text DEFAULT NULL,
 p_actual_duration_minutes integer DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_company text := public.get_auth_company_id(); v_appointment uuid; v_status text; v_estimated_duration integer; v_professional uuid;
BEGIN
 IF auth.uid() IS NULL OR v_company IS NULL OR COALESCE(public.get_auth_role(),'') NOT IN ('owner','staff') THEN
   RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501';
 END IF;
 IF p_actual_duration_minutes IS NOT NULL AND p_actual_duration_minutes NOT BETWEEN 1 AND 1440 THEN
   RAISE EXCEPTION 'invalid_duration' USING ERRCODE='22023';
 END IF;
 IF p_professional_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.team_members t WHERE t.id=p_professional_id AND t.user_id::text=v_company AND t.deleted_at IS NULL) THEN
   RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501';
 END IF;
 SELECT q.ticket_status, COALESCE(q.duration_minutes, (SELECT s.duration_minutes FROM public.services s WHERE s.id=q.service_id AND s.user_id::text=v_company)), COALESCE(p_professional_id,q.professional_id)
 INTO v_status, v_estimated_duration, v_professional FROM public.queue_entries q WHERE q.id=p_entry_id AND q.business_id::text=v_company FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 IF v_professional IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.team_members t WHERE t.id=v_professional AND t.user_id::text=v_company AND t.deleted_at IS NULL) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 IF v_status = 'settled' THEN RETURN; END IF;
 PERFORM public.settle_queue_ticket(p_entry_id,p_service_name,p_final_price,p_professional_id,p_payment_method);
 SELECT settled_appointment_id INTO v_appointment FROM public.queue_entries WHERE id=p_entry_id AND business_id::text=v_company;
 IF v_appointment IS NULL THEN RAISE EXCEPTION 'missing_appointment'; END IF;
 UPDATE public.appointments SET actual_duration_minutes=p_actual_duration_minutes, duration_minutes=v_estimated_duration WHERE id=v_appointment AND user_id::text=v_company;
 IF NOT FOUND THEN RAISE EXCEPTION 'missing_appointment'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.settle_queue_ticket_with_duration(uuid,text,numeric,uuid,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_queue_ticket_with_duration(uuid,text,numeric,uuid,text,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_chair_hour_v1(p_month date, p_professional_id uuid DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
 v_company text := public.get_auth_company_id(); v_role text := public.get_auth_role();
 v_start date := p_month; v_end date := COALESCE(p_end_date, (date_trunc('month',p_month::timestamp) + interval '1 month - 1 day')::date);
 v_timezone text; v_hours jsonb; v_threshold numeric := 20; v_staff uuid; v_result jsonb;
BEGIN
 IF auth.uid() IS NULL OR v_company IS NULL OR COALESCE(v_role,'') NOT IN ('owner','staff') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 IF v_start IS NULL OR v_end < v_start OR v_end-v_start > 365 THEN RAISE EXCEPTION 'invalid_period' USING ERRCODE='22023'; END IF;
 SELECT COALESCE(bs.timezone, CASE WHEN p.region='PT' THEN 'Europe/Lisbon' ELSE 'America/Sao_Paulo' END), bs.business_hours
 INTO v_timezone,v_hours FROM public.profiles p LEFT JOIN public.business_settings bs ON bs.user_id::text=v_company
 WHERE p.id=v_company LIMIT 1;
 SELECT COALESCE((SELECT low_margin_pct FROM public.chair_hour_settings WHERE company_id=v_company),20) INTO v_threshold;
 IF v_timezone IS NULL OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name=v_timezone) THEN v_timezone := 'UTC'; END IF;
 IF v_role = 'staff' THEN
   SELECT t.id INTO v_staff FROM public.team_members t WHERE t.user_id::text=v_company AND t.staff_user_id=auth.uid() AND t.active AND t.deleted_at IS NULL LIMIT 1;
   IF v_staff IS NULL OR (p_professional_id IS NOT NULL AND p_professional_id<>v_staff) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 ELSIF p_professional_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.team_members t WHERE t.user_id::text=v_company AND t.id=p_professional_id AND t.deleted_at IS NULL) THEN
   RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501';
 END IF;
 WITH professionals AS (
   SELECT t.id,t.name,COALESCE(t.working_hours,v_hours) AS hours
   FROM public.team_members t WHERE t.user_id::text=v_company AND t.active AND t.deleted_at IS NULL
 ), dates AS (
   SELECT x::date AS d FROM generate_series(v_start::timestamp,v_end::timestamp,interval '1 day') x
 ), hours_expanded AS (
   SELECT p.id,
     ((d.d + (b->>'start')::time) AT TIME ZONE v_timezone) AS starts,
     ((d.d + (b->>'end')::time) AT TIME ZONE v_timezone) AS ends
   FROM professionals p CROSS JOIN dates d
   CROSS JOIN LATERAL (SELECT p.hours->(ARRAY['sun','mon','tue','wed','thu','fri','sat'])[extract(dow FROM d.d)::int+1] AS day) h
   CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(h.day->'blocks')='array' THEN h.day->'blocks' ELSE '[]'::jsonb END) b
   WHERE h.day->>'isOpen'='true' AND b->>'start' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
     AND b->>'end' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND b->>'end' > b->>'start'
 ), open_hours AS (
   SELECT id,range_agg(tstzrange(starts,ends,'[)')) AS ranges FROM hours_expanded WHERE ends>starts GROUP BY id
 ), blocked AS (
   SELECT b.professional_id,range_agg(tstzrange(b.starts_at,b.ends_at,'[)')) AS ranges
   FROM public.agenda_blocks b JOIN professionals p ON p.id=b.professional_id
   WHERE b.user_id::text=v_company AND b.ends_at>b.starts_at
     AND b.starts_at < (v_end+1)::timestamp AT TIME ZONE v_timezone
     AND b.ends_at > v_start::timestamp AT TIME ZONE v_timezone GROUP BY b.professional_id
 ), available AS (
   SELECT p.id, CASE WHEN p.hours IS NULL THEN NULL ELSE COALESCE(sum(extract(epoch FROM (upper(x.r)-lower(x.r)))/60),0) END AS minutes
   FROM professionals p LEFT JOIN open_hours oh ON oh.id=p.id LEFT JOIN blocked b ON b.professional_id=p.id
   LEFT JOIN LATERAL unnest(COALESCE(oh.ranges,'{}'::tstzmultirange) - COALESCE(b.ranges,'{}'::tstzmultirange)) x(r) ON true
   GROUP BY p.id,p.hours
 ), costs AS (
   SELECT c.professional_id,sum(c.amount * x.days / x.month_days) AS amount
   FROM public.fixed_costs c CROSS JOIN LATERAL (
      SELECT count(*)::numeric AS days, extract(day FROM (date_trunc('month',d.d)+interval '1 month - 1 day'))::numeric AS month_days
      FROM dates d WHERE d.d>=c.start_date AND (c.end_date IS NULL OR d.d<=c.end_date)
      GROUP BY date_trunc('month',d.d)
   ) x WHERE c.company_id=v_company AND c.active GROUP BY c.professional_id
 ), cost_summary AS (SELECT count(*) AS configured FROM public.fixed_costs WHERE company_id=v_company AND active AND start_date<=v_end AND (end_date IS NULL OR end_date>=v_start)),
 shared AS (SELECT COALESCE(sum(amount),0) AS amount FROM costs WHERE professional_id IS NULL),
 attendance AS (
   SELECT a.id,a.professional_id,a.service,COALESCE(a.actual_duration_minutes,a.duration_minutes) AS minutes,
     (a.actual_duration_minutes IS NULL) AS estimated, fr.revenue AS revenue,
     fr.commission_value AS commission
   FROM public.appointments a JOIN professionals p ON p.id=a.professional_id
   LEFT JOIN LATERAL (SELECT CASE WHEN count(*)=1 THEN max(f.revenue) END AS revenue,
       CASE WHEN count(*)=1 THEN max(f.commission_value) END AS commission_value FROM public.finance_records f
     WHERE f.user_id::text=v_company AND f.appointment_id=a.id
       AND (f.type='revenue' OR (f.type='expense' AND f.description IS NULL AND f.revenue>0 AND f.revenue=a.price))
       AND NOT EXISTS (SELECT 1 FROM public.product_sales ps WHERE ps.finance_record_id=f.id)
     ) fr ON true
   WHERE a.user_id::text=v_company AND a.status='Completed'
     AND a.appointment_time >= v_start::timestamp AT TIME ZONE v_timezone
     AND a.appointment_time < (v_end+1)::timestamp AT TIME ZONE v_timezone
 ), service_match AS (
   SELECT a.*,s.id AS service_id,sc.amount AS material FROM attendance a
   LEFT JOIN LATERAL (SELECT min(s.id::text)::uuid AS id FROM public.services s WHERE s.user_id::text=v_company AND lower(trim(s.name))=lower(trim(a.service)) HAVING count(*)=1) s ON true
   LEFT JOIN public.service_costs sc ON sc.company_id=v_company AND sc.service_id=s.id
 ), agg AS (
   SELECT p.id,p.name,av.minutes AS available_minutes,
     COALESCE(sum(a.minutes) FILTER (WHERE a.minutes>0),0) AS worked_minutes,
     count(*) FILTER (WHERE a.id IS NOT NULL) AS attendance_count,
     count(*) FILTER (WHERE a.id IS NOT NULL AND (a.minutes IS NULL OR a.minutes<=0)) AS unknown_duration_count,
     count(*) FILTER (WHERE a.id IS NOT NULL AND a.revenue IS NULL) AS unknown_revenue_count,
     count(*) FILTER (WHERE a.id IS NOT NULL AND a.commission IS NULL) AS unknown_commission_count,
     count(*) FILTER (WHERE a.id IS NOT NULL AND a.estimated) AS estimated_count,
     COALESCE(sum(a.revenue),0) AS revenue,COALESCE(sum(a.commission),0) AS commission,
     CASE WHEN count(*) FILTER (WHERE a.id IS NOT NULL AND a.material IS NULL)>0 THEN NULL ELSE COALESCE(sum(a.material),0) END AS material_cost
   FROM professionals p JOIN available av ON av.id=p.id LEFT JOIN service_match a ON a.professional_id=p.id
   GROUP BY p.id,p.name,av.minutes
 ), metrics AS (
   SELECT a.*, CASE WHEN (SELECT configured FROM cost_summary)=0 OR (SELECT amount FROM shared)>0 AND bool_or(a.available_minutes IS NULL) OVER () THEN NULL ELSE COALESCE(c.amount,0) +
     CASE WHEN sum(a.available_minutes) OVER ()>0 THEN (SELECT amount FROM shared)*a.available_minutes/sum(a.available_minutes) OVER () ELSE 0 END END AS fixed_cost
   FROM agg a LEFT JOIN costs c ON c.professional_id=a.id
 ), final AS (
   SELECT m.*,CASE WHEN m.unknown_duration_count=0 AND m.unknown_revenue_count=0 THEN m.revenue/NULLIF(m.worked_minutes/60.0,0) END AS revenue_per_worked_hour,
     CASE WHEN m.unknown_revenue_count=0 THEN m.revenue/NULLIF(m.available_minutes/60,0) END AS revenue_per_available_hour,
     CASE WHEN m.unknown_duration_count=0 THEN m.worked_minutes/NULLIF(m.available_minutes,0) END AS occupancy,
     CASE WHEN m.unknown_duration_count=0 AND m.unknown_commission_count=0 THEN m.fixed_cost/NULLIF(m.available_minutes/60,0) + CASE WHEN m.attendance_count=0 THEN 0 ELSE (m.material_cost+m.commission)/NULLIF(m.worked_minutes/60.0,0) END END AS cost_per_hour,
     CASE WHEN m.unknown_duration_count=0 THEN m.fixed_cost/NULLIF(m.available_minutes/60,0)*GREATEST(m.available_minutes-m.worked_minutes,0)/60 END AS idle_cost
   FROM metrics m
 ), data AS (
   SELECT f.*, f.revenue_per_worked_hour-f.cost_per_hour AS margin_per_hour FROM final f
 ), service_results AS (
   SELECT s.service_id,min(s.service) AS name,
     CASE WHEN bool_or(s.material IS NULL OR s.revenue IS NULL OR s.commission IS NULL OR d.fixed_cost IS NULL OR d.available_minutes IS NULL OR d.available_minutes=0 OR s.minutes IS NULL OR s.minutes<=0) THEN NULL
       WHEN sum(s.revenue - s.commission - s.material - s.minutes/60.0*d.fixed_cost/NULLIF(d.available_minutes/60,0)) < 0 THEN 'loss'
       WHEN sum(s.revenue)>0 AND 100*sum(s.revenue-s.commission-s.material-s.minutes/60.0*d.fixed_cost/NULLIF(d.available_minutes/60,0))/sum(s.revenue)<=v_threshold THEN 'low'
       ELSE NULL END AS status
   FROM service_match s JOIN data d ON d.id=s.professional_id
   WHERE s.service_id IS NOT NULL AND (p_professional_id IS NULL OR s.professional_id=p_professional_id)
   GROUP BY s.service_id
 ), totals AS (
   SELECT CASE WHEN bool_or(d.available_minutes IS NULL) THEN NULL ELSE sum(d.available_minutes) END AS available_minutes,
     sum(d.worked_minutes) AS worked_minutes,sum(d.estimated_count) AS estimated_count,sum(d.revenue) AS revenue,
     sum(d.attendance_count) AS attendance_count, sum(d.unknown_duration_count) AS unknown_duration_count, sum(d.unknown_revenue_count) AS unknown_revenue_count, sum(d.unknown_commission_count) AS unknown_commission_count,
     CASE WHEN bool_or(d.idle_cost IS NULL) THEN NULL ELSE sum(d.idle_cost) END AS idle_cost,
     sum(d.commission) AS commission,CASE WHEN bool_or(d.material_cost IS NULL) THEN NULL ELSE sum(d.material_cost) END AS material_cost,
     CASE WHEN bool_or(d.fixed_cost IS NULL) THEN NULL ELSE sum(d.fixed_cost) END AS fixed_cost
   FROM data d WHERE p_professional_id IS NULL OR d.id=p_professional_id
 ), total_values AS (
   SELECT t.*,CASE WHEN t.unknown_duration_count=0 AND t.unknown_revenue_count=0 THEN t.revenue/NULLIF(t.worked_minutes/60.0,0) END AS revenue_per_worked_hour,
     CASE WHEN t.unknown_revenue_count=0 THEN t.revenue/NULLIF(t.available_minutes/60,0) END AS revenue_per_available_hour,
     CASE WHEN t.unknown_duration_count=0 THEN t.worked_minutes/NULLIF(t.available_minutes,0) END AS occupancy,
     CASE WHEN t.unknown_duration_count=0 AND t.unknown_commission_count=0 THEN t.fixed_cost/NULLIF(t.available_minutes/60,0)+CASE WHEN t.attendance_count=0 THEN 0 ELSE (t.material_cost+t.commission)/NULLIF(t.worked_minutes/60.0,0) END END AS cost_per_hour
   FROM totals t
 )
 SELECT jsonb_build_object('month',v_start,'end_date',v_end,'role',v_role,
   'professionals', COALESCE((SELECT jsonb_agg(CASE WHEN v_role='staff' THEN jsonb_build_object(
      'id',d.id,'name',d.name,'available_minutes',d.available_minutes,'worked_minutes',d.worked_minutes,'estimated_count',d.estimated_count,
      'revenue_per_worked_hour',d.revenue_per_worked_hour,'revenue_per_available_hour',d.revenue_per_available_hour,'occupancy',d.occupancy)
      ELSE to_jsonb(d) END ORDER BY d.name) FROM data d WHERE (v_role='staff' AND d.id=v_staff) OR (v_role='owner' AND (p_professional_id IS NULL OR d.id=p_professional_id))),'[]'::jsonb))
   || CASE WHEN v_role='owner' THEN jsonb_build_object('total',(SELECT to_jsonb(t) || jsonb_build_object('margin_per_hour',t.revenue_per_worked_hour-t.cost_per_hour) FROM total_values t),
       'services',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',s.name,'status',s.status) ORDER BY s.name) FROM service_results s WHERE s.status IS NOT NULL),'[]'::jsonb),
       'services_pending_count',(SELECT count(*) FROM service_match s JOIN data d ON d.id=s.professional_id WHERE (p_professional_id IS NULL OR s.professional_id=p_professional_id) AND (s.service_id IS NULL OR s.material IS NULL OR s.minutes IS NULL OR s.minutes<=0 OR s.revenue IS NULL OR s.commission IS NULL OR d.fixed_cost IS NULL OR d.available_minutes IS NULL OR d.available_minutes=0))) ELSE '{}'::jsonb END
 INTO v_result;
 RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.get_chair_hour_v1(date,uuid,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_chair_hour_v1(date,uuid,date) TO authenticated;
