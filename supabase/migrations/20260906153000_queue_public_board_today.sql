-- O painel do gestor só lista senhas de hoje. O board público contava
-- waiting/calling de qualquer data e inflava a posição do cliente.

CREATE OR REPLACE FUNCTION public.find_active_queue_entry_by_phone(
  p_business_id UUID,
  p_phone       TEXT
)
RETURNS SETOF public.queue_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT qe.*
  FROM public.queue_entries qe
  WHERE qe.business_id = p_business_id::text
    AND qe.status IN ('waiting', 'calling', 'serving')
    AND qe.joined_at >= date_trunc('day', now())
    AND public.phones_match(qe.client_phone, p_phone)
  ORDER BY qe.joined_at DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_active_queue_entry_by_phone(UUID, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_queue_public_board(p_entry_id UUID, p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry public.queue_entries%ROWTYPE;
  v_settings RECORD;
  v_service_name TEXT;
  v_people JSONB;
  v_position INTEGER;
  v_chairs INTEGER;
  v_eta_people JSONB;
  v_lane_start TIMESTAMPTZ := date_trunc('day', now());
BEGIN
  SELECT * INTO v_entry
  FROM public.queue_entries
  WHERE id = p_entry_id
    AND public.phones_match(client_phone, p_phone);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrada da fila nao encontrada.';
  END IF;

  SELECT COALESCE(queue_allow_leave, true) AS allow_leave,
         COALESCE(queue_late_minutes, 10) AS late_minutes,
         COALESCE(queue_mode, 'shared') AS queue_mode
  INTO v_settings
  FROM public.business_settings
  WHERE user_id = v_entry.business_id;

  SELECT name INTO v_service_name
  FROM public.services
  WHERE id = v_entry.service_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'position', pos,
      'firstName', split_part(trim(client_name), ' ', 1),
      'isYou', id = v_entry.id
    ) ORDER BY pos
  ), '[]'::jsonb)
  INTO v_people
  FROM (
    SELECT id, client_name,
           ROW_NUMBER() OVER (ORDER BY joined_at, id) AS pos
    FROM public.queue_entries
    WHERE business_id = v_entry.business_id
      AND status IN ('waiting', 'calling')
      AND joined_at >= v_lane_start
      AND (
        COALESCE(v_settings.queue_mode, 'shared') = 'shared'
        OR professional_id IS NOT DISTINCT FROM v_entry.professional_id
      )
  ) ranked;

  SELECT pos INTO v_position
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY joined_at, id) AS pos
    FROM public.queue_entries
    WHERE business_id = v_entry.business_id
      AND status IN ('waiting', 'calling')
      AND joined_at >= v_lane_start
      AND (
        COALESCE(v_settings.queue_mode, 'shared') = 'shared'
        OR professional_id IS NOT DISTINCT FROM v_entry.professional_id
      )
  ) ranked
  WHERE id = v_entry.id;

  SELECT COUNT(*)::INTEGER INTO v_chairs
  FROM public.team_members
  WHERE user_id = v_entry.business_id
    AND active = true;

  IF COALESCE(v_settings.queue_mode, 'shared') = 'per_professional' THEN
    v_chairs := 1;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'joinedAt', joined_at,
      'durationMinutes', COALESCE(duration_minutes, 30),
      'status', status,
      'professionalId', professional_id,
      'servingAt', serving_at
    )
  ), '[]'::jsonb)
  INTO v_eta_people
  FROM public.queue_entries
  WHERE business_id = v_entry.business_id
    AND status IN ('waiting', 'calling', 'serving')
    AND joined_at >= v_lane_start
    AND (
      COALESCE(v_settings.queue_mode, 'shared') = 'shared'
      OR professional_id IS NOT DISTINCT FROM v_entry.professional_id
    );

  RETURN jsonb_build_object(
    'entryId', v_entry.id,
    'status', v_entry.status,
    'paymentStatus', v_entry.payment_status,
    'serviceName', COALESCE(v_service_name, 'Servico'),
    'position', v_position,
    'etaMinutes', NULL,
    'people', v_people,
    'settings', jsonb_build_object(
      'allowLeave', COALESCE(v_settings.allow_leave, true),
      'lateMinutes', COALESCE(v_settings.late_minutes, 10)
    ),
    'calledAt', v_entry.called_at,
    'queueMode', COALESCE(v_settings.queue_mode, 'shared'),
    'chairs', COALESCE(v_chairs, 0),
    'professionalId', v_entry.professional_id,
    'etaPeople', v_eta_people
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_queue_public_board(UUID, TEXT) TO anon, authenticated;
