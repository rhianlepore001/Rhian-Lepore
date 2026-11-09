-- Estado "antigo" (antes da migration): pedidos do link aceitos/confirmados com origin default 'agenda',
-- mais um agendamento interno (sem pedido) e um da fila que NÃO podem mudar no backfill.
DO $$
DECLARE r text; b uuid;
BEGIN
  r := public.pbo_book('ad000000-0000-0000-0000-0000000000a0', '351910000101', public.pbo_slot(5, 9));
  b := split_part(r, '|', 2)::uuid;
  r := public.pbo_run_as('authenticated', 'ad000000-0000-0000-0000-0000000000a0', format('SELECT public.accept_public_booking_v2(%L)::text', b));
  IF r LIKE 'error:%' THEN RAISE EXCEPTION 'seed aceite: %', r; END IF;
  r := public.pbo_book('ad000000-0000-0000-0000-0000000000b0', '351910000102', public.pbo_slot(5, 10));
  IF r NOT LIKE 'confirmed|%' THEN RAISE EXCEPTION 'seed auto: %', r; END IF;
END $$;
INSERT INTO public.appointments (user_id, client_id, professional_id, service, appointment_time, price, status, duration_minutes, origin)
SELECT 'ad000000-0000-0000-0000-0000000000a0', c.id, 'ad000000-0000-0000-0001-0000000000a0', 'Interno', public.pbo_slot(6, 9), 40, 'Confirmed', 30, 'agenda'
FROM public.clients c WHERE c.user_id = 'ad000000-0000-0000-0000-0000000000a0' LIMIT 1;
INSERT INTO public.appointments (user_id, client_id, professional_id, service, appointment_time, price, status, duration_minutes, origin)
SELECT 'ad000000-0000-0000-0000-0000000000a0', c.id, 'ad000000-0000-0000-0001-0000000000a0', 'Fila', public.pbo_slot(6, 11), 40, 'Confirmed', 30, 'queue'
FROM public.clients c WHERE c.user_id = 'ad000000-0000-0000-0000-0000000000a0' LIMIT 1;
