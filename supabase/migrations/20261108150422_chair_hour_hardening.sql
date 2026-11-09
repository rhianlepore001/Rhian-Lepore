-- Additive hardening; run only after stage1. No production side effects until deployed.
BEGIN;
CREATE SCHEMA IF NOT EXISTS chair_hour_private;
REVOKE ALL ON SCHEMA chair_hour_private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS chair_hour_private.history (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 company_id text NOT NULL, kind text NOT NULL, entity_id text NOT NULL,
 effective_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(),
 baseline boolean NOT NULL DEFAULT false, value jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS chair_history_lookup ON chair_hour_private.history(company_id,kind,entity_id,effective_at DESC,id DESC);
ALTER TABLE chair_hour_private.history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON chair_hour_private.history FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS chair_hour_private.routine_backup(identity text PRIMARY KEY, definition text NOT NULL, original_acl aclitem[] NOT NULL);
REVOKE ALL ON chair_hour_private.routine_backup FROM PUBLIC,anon,authenticated;
INSERT INTO chair_hour_private.routine_backup
 SELECT p.oid::regprocedure::text,pg_get_functiondef(p.oid),COALESCE(p.proacl,acldefault('f',p.proowner)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname=ANY(ARRAY['get_chair_hour_v1','complete_appointment','complete_appointment_with_duration','settle_queue_ticket','settle_queue_ticket_with_duration','get_finance_stats','get_monthly_finance_history','get_dashboard_stats','get_dashboard_insights','get_dashboard_actions','get_aios_diagnostic','get_marketing_opportunities','get_professional_finance_summary','get_professional_commission_details','get_commissions_due','mark_expense_as_paid','recalculate_pending_commissions','update_commission_record','sell_product']) ON CONFLICT DO NOTHING;
-- Freeze the starting configuration, explicitly marked as an unverified baseline.
INSERT INTO chair_hour_private.history(company_id,kind,entity_id,effective_at,baseline,value)
 SELECT t.user_id::text,'professional',t.id::text,'-infinity',true,
 jsonb_build_object('working_hours',t.working_hours,'active',t.active AND t.deleted_at IS NULL)
 FROM public.team_members t WHERE NOT EXISTS (SELECT 1 FROM chair_hour_private.history h WHERE h.kind='professional' AND h.entity_id=t.id::text);
INSERT INTO chair_hour_private.history(company_id,kind,entity_id,effective_at,baseline,value)
 SELECT b.user_id::text,'business',b.user_id::text,'-infinity',true,jsonb_build_object('business_hours',b.business_hours,'timezone',COALESCE(b.timezone,(SELECT CASE WHEN p.region='PT' THEN 'Europe/Lisbon' ELSE 'America/Sao_Paulo' END FROM public.profiles p WHERE p.id=b.user_id::text)))
 FROM public.business_settings b WHERE NOT EXISTS (SELECT 1 FROM chair_hour_private.history h WHERE h.kind='business' AND h.entity_id=b.user_id::text);
INSERT INTO chair_hour_private.history(company_id,kind,entity_id,effective_at,baseline,value)
 SELECT c.company_id,'material',c.service_id::text,'-infinity',true,jsonb_build_object('amount',c.amount)
 FROM public.service_costs c WHERE NOT EXISTS (SELECT 1 FROM chair_hour_private.history h WHERE h.kind='material' AND h.entity_id=c.service_id::text);
CREATE OR REPLACE FUNCTION chair_hour_private.capture_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_kind text; v_company text; v_entity text; v_value jsonb; v_effective timestamptz:=clock_timestamp(); v_tz text;
BEGIN
 IF TG_TABLE_NAME='team_members' THEN
   IF TG_OP='UPDATE' AND NEW.working_hours IS NOT DISTINCT FROM OLD.working_hours AND NEW.active IS NOT DISTINCT FROM OLD.active AND NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at THEN RETURN NEW; END IF;
   v_kind:='professional'; v_company:=NEW.user_id::text; v_entity:=NEW.id::text;
   v_value:=jsonb_build_object('working_hours',NEW.working_hours,'active',NEW.active AND NEW.deleted_at IS NULL);
 ELSIF TG_TABLE_NAME='business_settings' THEN
   IF TG_OP='UPDATE' AND NEW.business_hours IS NOT DISTINCT FROM OLD.business_hours AND NEW.timezone IS NOT DISTINCT FROM OLD.timezone THEN RETURN NEW; END IF;
   v_kind:='business'; v_company:=NEW.user_id::text; v_entity:=NEW.user_id::text;
   v_value:=jsonb_build_object('business_hours',NEW.business_hours,'timezone',COALESCE(NEW.timezone,(SELECT CASE WHEN p.region='PT' THEN 'Europe/Lisbon' ELSE 'America/Sao_Paulo' END FROM public.profiles p WHERE p.id=NEW.user_id::text)));
 ELSE
   IF TG_OP='UPDATE' AND NEW.amount IS NOT DISTINCT FROM OLD.amount THEN RETURN NEW; END IF;
   v_kind:='material';
   IF TG_OP='DELETE' THEN v_company:=OLD.company_id; v_entity:=OLD.service_id::text; v_value:='{}';
   ELSE v_company:=NEW.company_id; v_entity:=NEW.service_id::text; v_value:=jsonb_build_object('amount',NEW.amount); END IF;
 END IF;
 -- Schedules/membership are whole-day inputs; changes begin the next local day.
 IF v_kind IN ('professional','business') THEN
   SELECT timezone INTO v_tz FROM public.business_settings WHERE user_id::text=v_company LIMIT 1;
   IF v_tz IS NULL OR NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=v_tz) THEN v_tz:='UTC'; END IF;
   v_effective:=(((v_effective AT TIME ZONE v_tz)::date+1)::timestamp AT TIME ZONE v_tz);
 END IF;
 INSERT INTO chair_hour_private.history(company_id,kind,entity_id,effective_at,value) VALUES(v_company,v_kind,v_entity,v_effective,v_value);
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION chair_hour_private.capture_history() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS chair_capture_professional ON public.team_members;
CREATE TRIGGER chair_capture_professional AFTER INSERT OR UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION chair_hour_private.capture_history();
DROP TRIGGER IF EXISTS chair_capture_business ON public.business_settings;
CREATE TRIGGER chair_capture_business AFTER INSERT OR UPDATE ON public.business_settings FOR EACH ROW EXECUTE FUNCTION chair_hour_private.capture_history();
DROP TRIGGER IF EXISTS chair_capture_material ON public.service_costs;
CREATE TRIGGER chair_capture_material AFTER INSERT OR UPDATE OR DELETE ON public.service_costs FOR EACH ROW EXECUTE FUNCTION chair_hour_private.capture_history();
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
 IF v_timezone IS NULL OR NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=v_timezone) THEN v_timezone:='UTC'; END IF;
 SELECT COALESCE((SELECT h.value->>'timezone' FROM chair_hour_private.history h WHERE h.company_id=v_company AND h.kind='business' AND h.effective_at <= v_start::timestamp AT TIME ZONE COALESCE(v_timezone,'UTC') ORDER BY h.effective_at DESC,h.id DESC LIMIT 1),v_timezone) INTO v_timezone;
 SELECT COALESCE((SELECT low_margin_pct FROM public.chair_hour_settings WHERE company_id=v_company),20) INTO v_threshold;
 IF v_timezone IS NULL OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name=v_timezone) THEN v_timezone := 'UTC'; END IF;
 IF EXISTS(SELECT 1 FROM (
  SELECT h.effective_at,h.value->>'timezone' AS tz,lag(h.value->>'timezone') OVER(ORDER BY h.effective_at,h.id) AS previous_tz,lag(h.id) OVER(ORDER BY h.effective_at,h.id) AS previous_id
  FROM chair_hour_private.history h WHERE h.company_id=v_company AND h.kind='business'
 ) x WHERE x.previous_id IS NOT NULL AND x.tz IS DISTINCT FROM x.previous_tz AND x.effective_at > v_start::timestamp AT TIME ZONE v_timezone AND x.effective_at < (v_end+1)::timestamp AT TIME ZONE v_timezone) THEN
  RAISE EXCEPTION 'timezone_changed_in_period_select_smaller_period' USING ERRCODE='22023';
 END IF;
 IF v_role = 'staff' THEN
   SELECT t.id INTO v_staff FROM public.team_members t WHERE t.user_id::text=v_company AND t.staff_user_id=auth.uid() AND t.active AND t.deleted_at IS NULL LIMIT 1;
   IF v_staff IS NULL OR (p_professional_id IS NOT NULL AND p_professional_id<>v_staff) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 ELSIF p_professional_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.team_members t WHERE t.user_id::text=v_company AND t.id=p_professional_id) THEN
   RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501';
 END IF;
 WITH professionals AS (
   SELECT t.id,t.name,t.is_owner
   FROM public.team_members t WHERE t.user_id::text=v_company AND (
     (t.active AND t.deleted_at IS NULL)
     OR EXISTS (SELECT 1 FROM public.appointments a WHERE a.user_id::text=v_company AND a.professional_id=t.id AND a.status='Completed' AND a.appointment_time >= v_start::timestamp AT TIME ZONE v_timezone AND a.appointment_time < (v_end+1)::timestamp AT TIME ZONE v_timezone)
     OR EXISTS (SELECT 1 FROM chair_hour_private.history h WHERE h.company_id=v_company AND h.kind='professional' AND h.entity_id=t.id::text AND (h.value->>'active')::boolean AND h.effective_at < (v_end+1)::timestamp AT TIME ZONE v_timezone AND NOT EXISTS (SELECT 1 FROM chair_hour_private.history n WHERE n.kind=h.kind AND n.entity_id=h.entity_id AND n.company_id=h.company_id AND (n.effective_at,n.id)>(h.effective_at,h.id) AND n.effective_at < v_start::timestamp AT TIME ZONE v_timezone))
   )
 ), dates AS (
   SELECT x::date AS d FROM generate_series(v_start::timestamp,v_end::timestamp,interval '1 day') x
 ), daily AS (
   SELECT p.id,d.d,
     CASE WHEN ph.value->>'active'='true' THEN COALESCE(NULLIF(ph.value->'working_hours','null'::jsonb),NULLIF(bh.value->'business_hours','null'::jsonb)) END AS hours,
     (ph.id IS NULL OR (ph.baseline AND ph.value->>'active' IS DISTINCT FROM 'true')) AS unknown
   FROM professionals p CROSS JOIN dates d
   LEFT JOIN LATERAL (SELECT h.* FROM chair_hour_private.history h WHERE h.company_id=v_company AND h.kind='professional' AND h.entity_id=p.id::text AND h.effective_at <= d.d::timestamp AT TIME ZONE v_timezone ORDER BY h.effective_at DESC,h.id DESC LIMIT 1) ph ON true
   LEFT JOIN LATERAL (SELECT h.* FROM chair_hour_private.history h WHERE h.company_id=v_company AND h.kind='business' AND h.entity_id=v_company AND h.effective_at <= d.d::timestamp AT TIME ZONE v_timezone ORDER BY h.effective_at DESC,h.id DESC LIMIT 1) bh ON true
 ), hours_expanded AS (
   SELECT p.id,
     ((p.d + (b->>'start')::time) AT TIME ZONE v_timezone) AS starts,
     ((p.d + (b->>'end')::time) AT TIME ZONE v_timezone) AS ends
   FROM daily p
   CROSS JOIN LATERAL (SELECT p.hours->(ARRAY['sun','mon','tue','wed','thu','fri','sat'])[extract(dow FROM p.d)::int+1] AS day) h
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
   SELECT p.id, CASE WHEN EXISTS (SELECT 1 FROM daily x WHERE x.id=p.id AND (x.unknown OR x.hours IS NULL AND NOT EXISTS (SELECT 1 FROM chair_hour_private.history h WHERE h.company_id=v_company AND h.kind='professional' AND h.entity_id=p.id::text AND h.value->>'active'='false' AND NOT h.baseline AND h.effective_at <= x.d::timestamp AT TIME ZONE v_timezone))) THEN NULL ELSE COALESCE(sum(extract(epoch FROM (upper(x.r)-lower(x.r)))/60),0) END AS minutes
   FROM professionals p LEFT JOIN open_hours oh ON oh.id=p.id LEFT JOIN blocked b ON b.professional_id=p.id
   LEFT JOIN LATERAL unnest(COALESCE(oh.ranges,'{}'::tstzmultirange) - COALESCE(b.ranges,'{}'::tstzmultirange)) x(r) ON true
   GROUP BY p.id
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
   SELECT a.id,a.professional_id,a.service,a.appointment_time,COALESCE(a.actual_duration_minutes,a.duration_minutes) AS minutes,
     (a.actual_duration_minutes IS NULL) AS estimated, CASE WHEN a.price>=0 THEN a.price END AS revenue,
     CASE WHEN p.is_owner THEN 0 ELSE fr.commission_value END AS commission, COALESCE(a.machine_fee_amount,0) AS machine_fee
   FROM public.appointments a JOIN professionals p ON p.id=a.professional_id
   LEFT JOIN LATERAL (SELECT CASE WHEN count(*)=1 THEN max(f.revenue) END AS revenue,
       CASE WHEN count(*)=1 THEN max(f.commission_value) END AS commission_value FROM public.finance_records f
     WHERE f.user_id::text=v_company AND f.appointment_id=a.id
       AND f.type='revenue'
       AND NOT EXISTS (SELECT 1 FROM public.product_sales ps WHERE ps.finance_record_id=f.id)
     ) fr ON true
   WHERE a.user_id::text=v_company AND a.status='Completed'
     AND a.appointment_time >= v_start::timestamp AT TIME ZONE v_timezone
     AND a.appointment_time < (v_end+1)::timestamp AT TIME ZONE v_timezone
 ), service_match AS (
   SELECT a.*,s.id AS service_id,(sc.value->>'amount')::numeric AS material FROM attendance a
   LEFT JOIN LATERAL (SELECT min(s.id::text)::uuid AS id FROM public.services s WHERE s.user_id::text=v_company AND lower(trim(s.name))=lower(trim(a.service)) HAVING count(*)=1) s ON true
   LEFT JOIN LATERAL (SELECT h.value FROM chair_hour_private.history h WHERE h.company_id=v_company AND h.kind='material' AND h.entity_id=s.id::text AND h.effective_at<=a.appointment_time ORDER BY h.effective_at DESC,h.id DESC LIMIT 1) sc ON true
 ), agg AS (
   SELECT p.id,p.name,av.minutes AS available_minutes,
     COALESCE(sum(a.minutes) FILTER (WHERE a.minutes>0),0) AS worked_minutes,
     count(*) FILTER (WHERE a.id IS NOT NULL) AS attendance_count,
     count(*) FILTER (WHERE a.id IS NOT NULL AND (a.minutes IS NULL OR a.minutes<=0)) AS unknown_duration_count,
     count(*) FILTER (WHERE a.id IS NOT NULL AND a.revenue IS NULL) AS unknown_revenue_count,
     count(*) FILTER (WHERE a.id IS NOT NULL AND a.commission IS NULL) AS unknown_commission_count,
     count(*) FILTER (WHERE a.id IS NOT NULL AND a.estimated) AS estimated_count,
     COALESCE(sum(a.revenue),0) AS revenue,COALESCE(sum(a.commission),0) AS commission,COALESCE(sum(a.machine_fee),0) AS machine_fee,
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
     CASE WHEN m.unknown_duration_count=0 AND m.unknown_commission_count=0 THEN m.fixed_cost/NULLIF(m.available_minutes/60,0) + CASE WHEN m.attendance_count=0 THEN 0 ELSE (m.material_cost+m.commission+m.machine_fee)/NULLIF(m.available_minutes/60.0,0) END END AS cost_per_hour,
     CASE WHEN m.unknown_duration_count=0 THEN m.fixed_cost/NULLIF(m.available_minutes/60,0)*GREATEST(m.available_minutes-m.worked_minutes,0)/60 END AS idle_cost
   FROM metrics m
 ), data AS (
   SELECT f.*, f.revenue_per_available_hour-f.cost_per_hour AS margin_per_hour FROM final f
 ), service_results AS (
   SELECT s.service_id,min(s.service) AS name,
     CASE WHEN bool_or(s.material IS NULL OR s.revenue IS NULL OR s.commission IS NULL OR d.fixed_cost IS NULL OR d.available_minutes IS NULL OR d.available_minutes=0 OR s.minutes IS NULL OR s.minutes<=0) THEN NULL
       WHEN sum(s.revenue - s.commission - s.machine_fee - s.material - s.minutes/60.0*d.fixed_cost/NULLIF(d.available_minutes/60,0)) < 0 THEN 'loss'
       WHEN sum(s.revenue)>0 AND 100*sum(s.revenue-s.commission-s.machine_fee-s.material-s.minutes/60.0*d.fixed_cost/NULLIF(d.available_minutes/60,0))/sum(s.revenue)<=v_threshold THEN 'low'
       ELSE NULL END AS status
   FROM service_match s JOIN data d ON d.id=s.professional_id
   WHERE s.service_id IS NOT NULL AND (p_professional_id IS NULL OR s.professional_id=p_professional_id)
   GROUP BY s.service_id
 ), totals AS (
   SELECT CASE WHEN bool_or(d.available_minutes IS NULL) THEN NULL ELSE sum(d.available_minutes) END AS available_minutes,
     sum(d.worked_minutes) AS worked_minutes,sum(d.estimated_count) AS estimated_count,sum(d.revenue) AS revenue,
     sum(d.attendance_count) AS attendance_count, sum(d.unknown_duration_count) AS unknown_duration_count, sum(d.unknown_revenue_count) AS unknown_revenue_count, sum(d.unknown_commission_count) AS unknown_commission_count,
     CASE WHEN bool_or(d.idle_cost IS NULL) THEN NULL ELSE sum(d.idle_cost) END AS idle_cost,
     sum(d.commission) AS commission,sum(d.machine_fee) AS machine_fee,CASE WHEN bool_or(d.material_cost IS NULL) THEN NULL ELSE sum(d.material_cost) END AS material_cost,
     CASE WHEN bool_or(d.fixed_cost IS NULL) THEN NULL ELSE sum(d.fixed_cost) END AS fixed_cost
   FROM data d WHERE p_professional_id IS NULL OR d.id=p_professional_id
 ), total_values AS (
   SELECT t.*,CASE WHEN t.unknown_duration_count=0 AND t.unknown_revenue_count=0 THEN t.revenue/NULLIF(t.worked_minutes/60.0,0) END AS revenue_per_worked_hour,
     CASE WHEN t.unknown_revenue_count=0 THEN t.revenue/NULLIF(t.available_minutes/60,0) END AS revenue_per_available_hour,
     CASE WHEN t.unknown_duration_count=0 THEN t.worked_minutes/NULLIF(t.available_minutes,0) END AS occupancy,
     CASE WHEN t.unknown_duration_count=0 AND t.unknown_commission_count=0 THEN t.fixed_cost/NULLIF(t.available_minutes/60,0)+CASE WHEN t.attendance_count=0 THEN 0 ELSE (t.material_cost+t.commission+t.machine_fee)/NULLIF(t.available_minutes/60.0,0) END END AS cost_per_hour
   FROM totals t
 )
 SELECT jsonb_build_object('month',v_start,'end_date',v_end,'role',v_role,'history_estimated',EXISTS(SELECT 1 FROM chair_hour_private.history h WHERE h.company_id=v_company AND h.baseline AND v_start < (h.recorded_at AT TIME ZONE v_timezone)::date),
   'professionals', COALESCE((SELECT jsonb_agg(CASE WHEN v_role='staff' THEN jsonb_build_object(
      'id',d.id,'name',d.name,'available_minutes',d.available_minutes,'worked_minutes',d.worked_minutes,'estimated_count',d.estimated_count,
      'revenue_per_worked_hour',d.revenue_per_worked_hour,'revenue_per_available_hour',d.revenue_per_available_hour,'occupancy',d.occupancy)
      ELSE to_jsonb(d) END ORDER BY d.name) FROM data d WHERE (v_role='staff' AND d.id=v_staff) OR (v_role='owner' AND (p_professional_id IS NULL OR d.id=p_professional_id))),'[]'::jsonb))
   || CASE WHEN v_role='owner' THEN jsonb_build_object('total',(SELECT to_jsonb(t) || jsonb_build_object('margin_per_hour',t.revenue_per_available_hour-t.cost_per_hour) FROM total_values t),
       'services',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',s.name,'status',s.status) ORDER BY s.name) FROM service_results s WHERE s.status IS NOT NULL),'[]'::jsonb),
       'unassigned_attendance_count',(SELECT count(*) FROM public.appointments a WHERE a.user_id::text=v_company AND a.status='Completed' AND a.appointment_time >= v_start::timestamp AT TIME ZONE v_timezone AND a.appointment_time < (v_end+1)::timestamp AT TIME ZONE v_timezone AND NOT EXISTS(SELECT 1 FROM professionals p WHERE p.id=a.professional_id)),
       'services_pending_count',(SELECT count(*) FROM service_match s JOIN data d ON d.id=s.professional_id WHERE (p_professional_id IS NULL OR s.professional_id=p_professional_id) AND (s.service_id IS NULL OR s.material IS NULL OR s.minutes IS NULL OR s.minutes<=0 OR s.revenue IS NULL OR s.commission IS NULL OR d.fixed_cost IS NULL OR d.available_minutes IS NULL OR d.available_minutes=0))) ELSE '{}'::jsonb END
 INTO v_result;
 RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.get_chair_hour_v1(date,uuid,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_chair_hour_v1(date,uuid,date) TO authenticated;

CREATE OR REPLACE FUNCTION chair_hour_private.guard_past_blocks() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_tz text; v_company text; v_start timestamptz;
BEGIN
 IF auth.uid() IS NULL THEN IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN v_company:=NEW.user_id::text; v_start:=NEW.starts_at; ELSE v_company:=OLD.user_id::text; v_start:=OLD.starts_at; END IF;
 SELECT timezone INTO v_tz FROM public.business_settings WHERE user_id::text=v_company LIMIT 1;
 IF v_tz IS NULL OR NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=v_tz) THEN v_tz:='UTC'; END IF;
 IF (v_start AT TIME ZONE v_tz)::date < (now() AT TIME ZONE v_tz)::date OR (TG_OP='UPDATE' AND (NEW.starts_at AT TIME ZONE v_tz)::date < (now() AT TIME ZONE v_tz)::date) THEN RAISE EXCEPTION 'block_history_immutable' USING ERRCODE='42501'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION chair_hour_private.guard_past_blocks() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS chair_guard_past_blocks ON public.agenda_blocks;
CREATE TRIGGER chair_guard_past_blocks BEFORE INSERT OR UPDATE OR DELETE ON public.agenda_blocks FOR EACH ROW EXECUTE FUNCTION chair_hour_private.guard_past_blocks();
-- Restrictive policies intersect EVERY legacy permissive policy, including own-row grants.
ALTER TABLE public.finance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chair_finance_owner_only ON public.finance_records;
DROP POLICY IF EXISTS chair_finance_read ON public.finance_records;
DROP POLICY IF EXISTS chair_finance_insert ON public.finance_records;
DROP POLICY IF EXISTS chair_finance_update ON public.finance_records;
DROP POLICY IF EXISTS chair_finance_delete ON public.finance_records;
-- Reads: owner sees the tenant; staff keeps exactly today's own-commission access
-- (legacy "Staff can view own commissions"), narrowed to its own revenue rows of the
-- member's own tenant: no colleagues, expenses or other financial types.
CREATE POLICY chair_finance_read ON public.finance_records AS RESTRICTIVE FOR SELECT TO authenticated
 USING (
  (user_id::text=(SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role())='owner')
  OR (type='revenue' AND EXISTS (SELECT 1 FROM public.team_members tm
       WHERE tm.id=finance_records.professional_id AND tm.staff_user_id=(SELECT auth.uid())
         AND tm.user_id::text=finance_records.user_id::text))
 );
-- Writes stay owner-only (staff never had a write policy here).
CREATE POLICY chair_finance_insert ON public.finance_records AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK (user_id::text=(SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role())='owner');
CREATE POLICY chair_finance_update ON public.finance_records AS RESTRICTIVE FOR UPDATE TO authenticated
 USING (user_id::text=(SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role())='owner')
 WITH CHECK (user_id::text=(SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role())='owner');
CREATE POLICY chair_finance_delete ON public.finance_records AS RESTRICTIVE FOR DELETE TO authenticated
 USING (user_id::text=(SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role())='owner');
-- product_sales carries cost/commission of every colleague: owner-only now.
-- products is restricted in 20261109103000 AFTER the frontend that reads the catalog through
-- get_checkout_products_v1 is live, so staff checkout keeps listing products in between.
DO $$ BEGIN
 IF to_regclass('public.product_sales') IS NOT NULL THEN
  ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS chair_products_owner_only ON public.product_sales;
  CREATE POLICY chair_products_owner_only ON public.product_sales AS RESTRICTIVE FOR ALL TO authenticated USING (company_id::text=public.get_auth_company_id() AND public.get_auth_role()='owner') WITH CHECK (company_id::text=public.get_auth_company_id() AND public.get_auth_role()='owner');
 END IF;
END $$;
-- Keep the original versioned routines, but close every known financial overload.
-- No regex-generated authorization based on user data: only this explicit allowlist.
DO $$ DECLARE r record; definition text; guard text; BEGIN
 guard := $g$BEGIN
 IF auth.uid() IS NULL OR public.get_auth_role() IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 $g$;
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql')
  AND p.proname=ANY(ARRAY['get_finance_stats','get_monthly_finance_history','get_dashboard_stats','get_dashboard_insights','get_dashboard_actions','get_aios_diagnostic','get_marketing_opportunities','get_professional_finance_summary','get_professional_commission_details','get_commissions_due','mark_expense_as_paid','recalculate_pending_commissions','update_commission_record'])
 LOOP
  definition:=pg_get_functiondef(r.oid);
  IF position(guard IN definition)=0 THEN EXECUTE regexp_replace(definition,'\mBEGIN\M',guard,'i'); END IF;
 END LOOP;
END $$;
DO $$ DECLARE d text; BEGIN
 d:=pg_get_functiondef('public.complete_appointment(uuid,text,uuid,uuid,numeric,numeric,numeric)'::regprocedure);
 d:=replace(d,E'INSERT INTO public.finance_records (\n    user_id,',E'INSERT INTO public.finance_records (\n    type, user_id,');
 d:=replace(d,E') VALUES (\n    v_appointment.user_id,',E') VALUES (\n    ''revenue'', v_appointment.user_id,');
 EXECUTE d;
END $$;
-- Close legacy completion entrypoints too. A wrapper alone is not a security boundary.
DO $$ DECLARE r record; definition text; guard text; BEGIN
 FOR r IN SELECT p.oid,p.proname,p.proargnames FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname=ANY(ARRAY['complete_appointment','complete_appointment_with_duration','settle_queue_ticket','settle_queue_ticket_with_duration']) LOOP
 guard:=$g$BEGIN
 IF auth.uid() IS NULL OR COALESCE(public.get_auth_role(),'') NOT IN ('owner','staff') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 $g$;
 IF r.proname LIKE 'complete_%' THEN
 guard:=guard||$g$
 IF public.get_auth_role()='staff' AND (NOT EXISTS (
 SELECT 1 FROM public.team_members t WHERE t.user_id::text=public.get_auth_company_id()
 AND t.staff_user_id=auth.uid() AND t.active AND t.deleted_at IS NULL
 ) OR NOT EXISTS (SELECT 1 FROM public.appointments a WHERE a.id=p_appointment_id AND a.user_id::text=public.get_auth_company_id()))
 THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 $g$;
 ELSE
 guard:=guard||$g$
 IF public.get_auth_role()='staff' AND (NOT EXISTS (
 SELECT 1 FROM public.team_members t WHERE t.user_id::text=public.get_auth_company_id()
 AND t.staff_user_id=auth.uid() AND t.active AND t.deleted_at IS NULL
 ) OR NOT EXISTS (SELECT 1 FROM public.queue_entries q WHERE q.id=p_entry_id AND q.business_id::text=public.get_auth_company_id()))
 THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 $g$;
 END IF;
 IF r.proname LIKE 'complete_%' AND 'p_received_by'=ANY(r.proargnames) THEN
 guard:=guard||$g$
 IF (p_received_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.team_members WHERE id=p_received_by AND user_id::text=public.get_auth_company_id() AND deleted_at IS NULL)) OR (p_completed_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.team_members WHERE id=p_completed_by AND user_id::text=public.get_auth_company_id() AND deleted_at IS NULL)) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 $g$;
 END IF;
 IF r.proname LIKE 'settle_%' THEN
 guard:=guard||$g$
 IF EXISTS(SELECT 1 FROM public.queue_entries q WHERE q.id=p_entry_id AND q.business_id::text=public.get_auth_company_id() AND COALESCE(p_professional_id,q.professional_id) IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.team_members t WHERE t.id=COALESCE(p_professional_id,q.professional_id) AND t.user_id::text=q.business_id::text AND t.deleted_at IS NULL)) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 $g$;
 END IF;
 IF r.proname='complete_appointment' THEN
 guard:=guard||$g$
 PERFORM 1 FROM public.appointments WHERE id=p_appointment_id AND user_id::text=public.get_auth_company_id() FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.appointments WHERE id=p_appointment_id AND user_id::text=public.get_auth_company_id() AND status='Completed') THEN RETURN; END IF;
 $g$;
 END IF;
 definition:=pg_get_functiondef(r.oid);
 IF position(guard IN definition)=0 THEN EXECUTE regexp_replace(definition,'\mBEGIN\M',guard,'i'); END IF;
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon',r.oid::regprocedure);
 END LOOP;
END $$;
-- Checkout needs stock/sale prices, not product costs or margins. No raw-row projection.
CREATE OR REPLACE FUNCTION public.get_checkout_products_v1(p_company_id text, p_include_inactive boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_role text:=public.get_auth_role(); result jsonb;
BEGIN
 IF auth.uid() IS NULL OR p_company_id IS DISTINCT FROM public.get_auth_company_id() OR COALESCE(v_role,'') NOT IN ('owner','staff') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 IF v_role='staff' AND NOT EXISTS(SELECT 1 FROM public.team_members t WHERE t.user_id::text=p_company_id AND t.staff_user_id=auth.uid() AND t.active AND t.deleted_at IS NULL) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 SELECT COALESCE(jsonb_agg(CASE WHEN v_role='owner' THEN to_jsonb(p) ELSE jsonb_build_object('id',p.id,'company_id',p.company_id,'name',p.name,'sale_price',p.sale_price,'stock_quantity',p.stock_quantity,'min_stock_quantity',p.min_stock_quantity,'is_active',p.is_active,'show_in_public',p.show_in_public) END ORDER BY p.name),'[]') INTO result
 FROM public.products p WHERE p.company_id::text=p_company_id AND (p.is_active OR p_include_inactive AND v_role='owner');
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_checkout_products_v1(text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_checkout_products_v1(text,boolean) TO authenticated;
-- Appointment product lines need the SALE price only. Own business, inactive included, never costs.
CREATE OR REPLACE FUNCTION public.get_product_sale_prices_v1(p_product_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_company text:=public.get_auth_company_id(); v_role text:=public.get_auth_role(); result jsonb;
BEGIN
 IF auth.uid() IS NULL OR v_company IS NULL OR COALESCE(v_role,'') NOT IN ('owner','staff') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 IF v_role='staff' AND NOT EXISTS(SELECT 1 FROM public.team_members t WHERE t.user_id::text=v_company AND t.staff_user_id=auth.uid() AND t.active AND t.deleted_at IS NULL) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 IF p_product_ids IS NULL OR cardinality(p_product_ids)>200 THEN RAISE EXCEPTION 'invalid_products' USING ERRCODE='22023'; END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'sale_price',p.sale_price) ORDER BY p.name),'[]') INTO result
 FROM public.products p WHERE p.company_id::text=v_company AND p.id=ANY(p_product_ids);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_product_sale_prices_v1(uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_product_sale_prices_v1(uuid[]) TO authenticated;
-- Preserve product sales implementation privately; never expose its cost-bearing row to staff.
DO $$ BEGIN
 IF to_regprocedure('chair_hour_private.sell_product(uuid,integer,uuid,uuid,uuid,text)') IS NULL AND to_regprocedure('public.sell_product(uuid,integer,uuid,uuid,uuid,text)') IS NOT NULL THEN
 ALTER FUNCTION public.sell_product(uuid,integer,uuid,uuid,uuid,text) SET SCHEMA chair_hour_private;
 END IF;
END $$;
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='chair_hour_private' AND p.proname='sell_product') OR (n.nspname='public' AND p.proname='sell_product') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',r.oid::regprocedure);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.sell_product(p_product_id uuid,p_quantity integer,p_appointment_id uuid DEFAULT NULL,p_client_id uuid DEFAULT NULL,p_professional_id uuid DEFAULT NULL,p_payment_method text DEFAULT NULL)
RETURNS public.product_sales LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_sale public.product_sales; v_role text:=public.get_auth_role();
BEGIN
 IF auth.uid() IS NULL OR COALESCE(v_role,'') NOT IN ('owner','staff') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 -- Today's rule: any ACTIVE team member sells for the business (the private function keeps
 -- validating appointment/client/professional against the caller's business).
 IF v_role='staff' AND NOT EXISTS(SELECT 1 FROM public.team_members WHERE user_id::text=public.get_auth_company_id() AND staff_user_id=auth.uid() AND active AND deleted_at IS NULL) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 v_sale:=chair_hour_private.sell_product(p_product_id,p_quantity,p_appointment_id,p_client_id,p_professional_id,p_payment_method);
 IF v_role='staff' THEN v_sale.unit_cost_price:=NULL; v_sale.total_cost:=NULL; v_sale.commission_value:=NULL; v_sale.commission_percent:=NULL; END IF;
 RETURN v_sale;
END $$;
REVOKE ALL ON FUNCTION public.sell_product(uuid,integer,uuid,uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sell_product(uuid,integer,uuid,uuid,uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.complete_appointment_checkout_v1(
 p_appointment_id uuid,p_payment_method text DEFAULT NULL,p_received_by uuid DEFAULT NULL,p_completed_by uuid DEFAULT NULL,
 p_machine_fee_percent numeric DEFAULT 0,p_machine_fee_amount numeric DEFAULT 0,p_final_price numeric DEFAULT NULL,
 p_actual_duration_minutes integer DEFAULT NULL,p_products jsonb DEFAULT '[]')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.appointments%ROWTYPE; line record; seller uuid; v_company text:=public.get_auth_company_id();
BEGIN
 IF auth.uid() IS NULL OR v_company IS NULL OR COALESCE(public.get_auth_role(),'') NOT IN ('owner','staff') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM public.appointments WHERE id=p_appointment_id AND user_id::text=v_company FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 -- Today's rule: any ACTIVE team member closes any appointment of the business (colleague's or unassigned).
 IF public.get_auth_role()='staff' AND NOT EXISTS(SELECT 1 FROM public.team_members t WHERE t.user_id::text=v_company AND t.staff_user_id=auth.uid() AND t.active AND t.deleted_at IS NULL) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 -- Under the same row lock, a lost response/retry cannot sell or deduct stock twice.
 IF a.status='Completed' THEN RETURN; END IF;
 IF a.status IN ('Cancelled','NoShow') THEN RAISE EXCEPTION 'invalid_status' USING ERRCODE='22023'; END IF;
 IF p_machine_fee_percent IS NULL OR p_machine_fee_percent NOT BETWEEN 0 AND 100 OR p_machine_fee_amount IS NULL OR p_machine_fee_amount<0 OR p_machine_fee_amount>COALESCE(p_final_price,a.price) OR COALESCE(p_final_price,a.price) IS NULL OR COALESCE(p_final_price,a.price)<0 THEN RAISE EXCEPTION 'invalid_price' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_products) IS DISTINCT FROM 'array' OR jsonb_array_length(p_products)>100 THEN RAISE EXCEPTION 'invalid_products' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_to_recordset(p_products) AS x(product_id uuid,quantity integer) WHERE x.product_id IS NULL OR x.quantity IS NULL OR x.quantity<=0) THEN RAISE EXCEPTION 'invalid_quantity' USING ERRCODE='22023'; END IF;
 seller:=COALESCE(p_received_by,a.professional_id);
 -- Validate all references through the duration entrypoint before any stock mutation.
 PERFORM public.complete_appointment_with_duration(p_appointment_id,p_payment_method,p_received_by,p_completed_by,p_machine_fee_percent,p_machine_fee_amount,p_final_price,p_actual_duration_minutes);
 FOR line IN SELECT x.product_id, sum(x.quantity)::integer AS quantity FROM jsonb_to_recordset(p_products) AS x(product_id uuid,quantity integer) GROUP BY x.product_id ORDER BY x.product_id LOOP
  IF line.product_id IS NULL OR line.quantity IS NULL OR line.quantity<=0 THEN RAISE EXCEPTION 'invalid_quantity' USING ERRCODE='22023'; END IF;
  PERFORM chair_hour_private.sell_product(line.product_id,line.quantity,p_appointment_id,a.client_id,seller,p_payment_method);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.complete_appointment_checkout_v1(uuid,text,uuid,uuid,numeric,numeric,numeric,integer,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_appointment_checkout_v1(uuid,text,uuid,uuid,numeric,numeric,numeric,integer,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.settle_queue_checkout_v1(
 p_entry_id uuid,p_service_name text DEFAULT NULL,p_final_price numeric DEFAULT NULL,p_professional_id uuid DEFAULT NULL,p_payment_method text DEFAULT NULL,
 p_actual_duration_minutes integer DEFAULT NULL,p_products jsonb DEFAULT '[]')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE q public.queue_entries%ROWTYPE; a public.appointments%ROWTYPE; line record; v_company text:=public.get_auth_company_id();
BEGIN
 IF auth.uid() IS NULL OR v_company IS NULL OR COALESCE(public.get_auth_role(),'') NOT IN ('owner','staff') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO q FROM public.queue_entries WHERE id=p_entry_id AND business_id::text=v_company FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 IF public.get_auth_role()='staff' AND NOT EXISTS(SELECT 1 FROM public.team_members t WHERE t.user_id::text=v_company AND t.staff_user_id=auth.uid() AND t.active AND t.deleted_at IS NULL) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 IF q.ticket_status='settled' THEN RETURN; END IF;
 IF q.payment_status='awaiting_confirmation' THEN RAISE EXCEPTION 'payment_confirmation_required' USING ERRCODE='22023'; END IF;
 IF COALESCE(p_final_price,q.service_price_cents/100.0,0)<0 THEN RAISE EXCEPTION 'invalid_price' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_products) IS DISTINCT FROM 'array' OR jsonb_array_length(p_products)>100 THEN RAISE EXCEPTION 'invalid_products' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_to_recordset(p_products) AS x(product_id uuid,quantity integer) WHERE x.product_id IS NULL OR x.quantity IS NULL OR x.quantity<=0) THEN RAISE EXCEPTION 'invalid_quantity' USING ERRCODE='22023'; END IF;
 PERFORM public.settle_queue_ticket_with_duration(p_entry_id,p_service_name,p_final_price,p_professional_id,p_payment_method,p_actual_duration_minutes);
 SELECT * INTO a FROM public.appointments WHERE id=(SELECT settled_appointment_id FROM public.queue_entries WHERE id=p_entry_id) AND user_id::text=v_company;
 IF NOT FOUND THEN RAISE EXCEPTION 'missing_appointment'; END IF;
 FOR line IN SELECT x.product_id,sum(x.quantity)::integer AS quantity FROM jsonb_to_recordset(p_products) AS x(product_id uuid,quantity integer) GROUP BY x.product_id ORDER BY x.product_id LOOP
  PERFORM chair_hour_private.sell_product(line.product_id,line.quantity,a.id,a.client_id,a.professional_id,COALESCE(p_payment_method,q.payment_method));
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.settle_queue_checkout_v1(uuid,text,numeric,uuid,text,integer,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.settle_queue_checkout_v1(uuid,text,numeric,uuid,text,integer,jsonb) TO authenticated;
COMMIT;
