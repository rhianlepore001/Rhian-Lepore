-- Dados fictícios para public_booking_origin (aplicados ANTES da migration).
--   ad…a0 negócio M (aprovação manual)   ad…b0 negócio A (confirmação automática)
SET TIMEZONE = 'UTC';
CREATE OR REPLACE FUNCTION public.pbo_run_as(p_role text, p_uid text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
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
GRANT EXECUTE ON FUNCTION public.pbo_run_as(text, text, text) TO PUBLIC;
CREATE OR REPLACE FUNCTION public.pbo_slot(p_days int, p_hour int) RETURNS timestamptz LANGUAGE sql AS $$
  SELECT date_trunc('day', now()) + make_interval(days => p_days, hours => p_hour)
$$;
CREATE OR REPLACE FUNCTION public.pbo_book(p_biz text, p_phone text, p_at timestamptz) RETURNS text LANGUAGE sql AS $$
  SELECT public.pbo_run_as('anon', NULL, format(
    'SELECT status || ''|'' || id FROM public.create_public_booking(%L, %L, %L, ARRAY[%L]::uuid[], %L::uuid, %L::timestamptz, 40, 30, ''[]''::jsonb)',
    p_biz, 'Cliente Fictício ' || right(p_phone, 2), p_phone, 'ad000000-0000-0000-0002-' || right(p_biz, 12),
    'ad000000-0000-0000-0001-' || right(p_biz, 12), p_at))
$$;

INSERT INTO public.profiles (id, role, company_id) VALUES
  ('ad000000-0000-0000-0000-0000000000a0', 'owner', 'ad000000-0000-0000-0000-0000000000a0'),
  ('ad000000-0000-0000-0000-0000000000b0', 'owner', 'ad000000-0000-0000-0000-0000000000b0');
UPDATE public.profiles SET booking_lead_time_hours = 0 WHERE id LIKE 'ad000000-%';
INSERT INTO public.team_members (id, user_id, name, is_owner, active, display_order) VALUES
  ('ad000000-0000-0000-0001-0000000000a0', 'ad000000-0000-0000-0000-0000000000a0', 'Profissional M', false, true, 1),
  ('ad000000-0000-0000-0001-0000000000b0', 'ad000000-0000-0000-0000-0000000000b0', 'Profissional A', false, true, 1);
INSERT INTO public.services (id, user_id, name, price, duration_minutes, active) VALUES
  ('ad000000-0000-0000-0002-0000000000a0', 'ad000000-0000-0000-0000-0000000000a0', 'Corte', 40, 30, true),
  ('ad000000-0000-0000-0002-0000000000b0', 'ad000000-0000-0000-0000-0000000000b0', 'Corte', 40, 30, true);
INSERT INTO public.business_settings (user_id, business_hours, timezone)
SELECT b, (SELECT jsonb_object_agg(d, jsonb_build_object('isOpen', true, 'blocks', jsonb_build_array(jsonb_build_object('start', '08:00', 'end', '20:00'))))
           FROM unnest(ARRAY['sun','mon','tue','wed','thu','fri','sat']) d), 'UTC'
FROM unnest(ARRAY['ad000000-0000-0000-0000-0000000000a0','ad000000-0000-0000-0000-0000000000b0']) b
ON CONFLICT (user_id) DO UPDATE SET business_hours = EXCLUDED.business_hours, timezone = EXCLUDED.timezone;
UPDATE public.business_settings SET online_booking_requires_approval = false WHERE user_id = 'ad000000-0000-0000-0000-0000000000b0';
