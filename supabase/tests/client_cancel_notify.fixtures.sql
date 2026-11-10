-- Dados fictícios (aplicados antes da migration). ce…a0 manual (barbearia)  ce…b0 automático (salão)
SET TIMEZONE = 'UTC';
CREATE OR REPLACE FUNCTION public.ccn_run_as(p_role text, p_uid text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid, ''), false);
  EXECUTE format('SET ROLE %I', p_role);
  BEGIN
    EXECUTE p_sql INTO v;
    EXECUTE 'RESET ROLE';
    PERFORM set_config('request.jwt.claim.sub', '', false);
    RETURN COALESCE(v, 'ok');
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    PERFORM set_config('request.jwt.claim.sub', '', false);
    RETURN 'error:' || SQLERRM;
  END;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ccn_run_as(text, text, text) TO PUBLIC;
CREATE OR REPLACE FUNCTION public.ccn_slot(p_days int, p_hour int) RETURNS timestamptz LANGUAGE sql AS $$
  SELECT date_trunc('day', now()) + make_interval(days => p_days, hours => p_hour)
$$;
CREATE OR REPLACE FUNCTION public.ccn_book(p_biz text, p_phone text, p_at timestamptz) RETURNS text LANGUAGE sql AS $$
  SELECT public.ccn_run_as('anon', NULL, format(
    'SELECT status || ''|'' || id FROM public.create_public_booking(%L, %L, %L, ARRAY[%L]::uuid[], %L::uuid, %L::timestamptz, 40, 30, ''[]''::jsonb)',
    p_biz, 'Cliente Fictício ' || right(p_phone, 2), p_phone, 'ce000000-0000-0000-0002-' || right(p_biz, 12),
    'ce000000-0000-0000-0001-' || right(p_biz, 12), p_at))
$$;
CREATE OR REPLACE FUNCTION public.ccn_cancel(p_id uuid, p_phone text) RETURNS text LANGUAGE sql AS $$
  SELECT public.ccn_run_as('anon', NULL, format('SELECT public.cancel_public_booking_by_client_v2(%L::uuid, %L)::text', p_id, p_phone))
$$;

INSERT INTO public.profiles (id, role, company_id) VALUES
  ('ce000000-0000-0000-0000-0000000000a0', 'owner', 'ce000000-0000-0000-0000-0000000000a0'),
  ('ce000000-0000-0000-0000-0000000000b0', 'owner', 'ce000000-0000-0000-0000-0000000000b0'),
  ('ce000000-0000-0000-0000-0000000000a9', 'staff', 'ce000000-0000-0000-0000-0000000000a0');
UPDATE public.profiles SET booking_lead_time_hours = 0 WHERE id LIKE 'ce000000-%';
INSERT INTO public.team_members (id, user_id, name, is_owner, active, display_order, staff_user_id) VALUES
  ('ce000000-0000-0000-0001-0000000000a0', 'ce000000-0000-0000-0000-0000000000a0', 'Profissional M', false, true, 1, 'ce000000-0000-0000-0000-0000000000a9'),
  ('ce000000-0000-0000-0001-0000000000b0', 'ce000000-0000-0000-0000-0000000000b0', 'Profissional A', false, true, 1, NULL);
INSERT INTO public.services (id, user_id, name, price, duration_minutes, active) VALUES
  ('ce000000-0000-0000-0002-0000000000a0', 'ce000000-0000-0000-0000-0000000000a0', 'Corte', 40, 30, true),
  ('ce000000-0000-0000-0002-0000000000b0', 'ce000000-0000-0000-0000-0000000000b0', 'Escova', 40, 30, true);
INSERT INTO public.business_settings (user_id, business_hours, timezone)
SELECT b, (SELECT jsonb_object_agg(d, jsonb_build_object('isOpen', true, 'blocks', jsonb_build_array(jsonb_build_object('start', '08:00', 'end', '20:00'))))
           FROM unnest(ARRAY['sun','mon','tue','wed','thu','fri','sat']) d), 'UTC'
FROM unnest(ARRAY['ce000000-0000-0000-0000-0000000000a0','ce000000-0000-0000-0000-0000000000b0']) b
ON CONFLICT (user_id) DO UPDATE SET business_hours = EXCLUDED.business_hours, timezone = EXCLUDED.timezone;
UPDATE public.business_settings SET online_booking_requires_approval = false WHERE user_id = 'ce000000-0000-0000-0000-0000000000b0';
