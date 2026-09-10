-- Migration: broadcast realtime da fila para o cliente (anon) e para o gestor
-- Data: 2026-09-10
-- Contexto: o cliente na área pública (/#/minha-area/:slug, aba Fila) não tem
-- SELECT em queue_entries, então `postgres_changes` nunca chega até ele e a tela
-- só percebia o "Chamar" no próximo poll. Em vez de abrir a tabela para anon,
-- um trigger publica um evento de broadcast no tópico `queue:<business_id>` com
-- apenas id/status/timestamps (sem nome ou telefone). Quem escuta o tópico
-- refaz a leitura pelas RPCs públicas já protegidas por telefone.

CREATE OR REPLACE FUNCTION public.queue_entries_broadcast()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.queue_entries%ROWTYPE;
BEGIN
  v_row := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;

  BEGIN
    PERFORM realtime.send(
      jsonb_build_object(
        'op', TG_OP,
        'entryId', v_row.id,
        'businessId', v_row.business_id,
        'status', v_row.status,
        'paymentStatus', v_row.payment_status,
        'ticketStatus', v_row.ticket_status,
        'calledAt', v_row.called_at,
        'servingAt', v_row.serving_at,
        'closedAt', v_row.closed_at,
        'at', now()
      ),
      'queue_entry',
      'queue:' || v_row.business_id::text,
      true
    );
  EXCEPTION WHEN OTHERS THEN
    -- Broadcast é best-effort: nunca pode derrubar a operação da fila.
    RAISE WARNING 'queue_entries_broadcast: %', SQLERRM;
  END;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS queue_entries_broadcast_trg ON public.queue_entries;
CREATE TRIGGER queue_entries_broadcast_trg
AFTER INSERT OR UPDATE OR DELETE ON public.queue_entries
FOR EACH ROW EXECUTE FUNCTION public.queue_entries_broadcast();

-- Canal privado: quem assina `queue:<business_id>` precisa passar pela policy
-- de realtime.messages. O payload não carrega dado pessoal, então anon e
-- authenticated podem ler qualquer tópico da fila.
DROP POLICY IF EXISTS "Queue topics are readable" ON realtime.messages;
CREATE POLICY "Queue topics are readable"
ON realtime.messages
FOR SELECT
TO anon, authenticated
USING (realtime.topic() LIKE 'queue:%' AND realtime.messages.extension = 'broadcast');

-- Tempo estimado: se não houver colaborador ativo, ainda existe o dono (1 cadeira).
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

  IF COALESCE(v_settings.queue_mode, 'shared') = 'per_professional' THEN
    v_chairs := 1;
  ELSE
    SELECT GREATEST(COUNT(*)::INTEGER, 1) INTO v_chairs
    FROM public.team_members
    WHERE user_id = v_entry.business_id
      AND active = true;
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
    'chairs', COALESCE(v_chairs, 1),
    'professionalId', v_entry.professional_id,
    'etaPeople', v_eta_people
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_queue_public_board(UUID, TEXT) TO anon, authenticated;
