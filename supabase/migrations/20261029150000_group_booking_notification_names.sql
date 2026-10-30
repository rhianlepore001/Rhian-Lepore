-- Avisos do dono para pedidos em grupo: mostram quem será atendido.
-- Antes: os três pedidos de um grupo apareciam com o nome de quem fez o pedido
-- ("Novo pedido: Mariana Exemplo, ..."). Agora: "Novo pedido: Ana Exemplo (responsável: Mariana Exemplo), ...".
-- Aditiva: só troca o corpo de notify_booking_recipients (mesma assinatura, dono, SECURITY DEFINER,
-- search_path e permissões). Sem coluna, tabela ou dado novo. Avisos já gravados não são alterados.
-- Rollback: docs/rollbacks/20261029150000_group_booking_notification_names.rollback.sql

BEGIN;

CREATE OR REPLACE FUNCTION public.notify_booking_recipients(
  p_booking public.public_bookings,
  p_kind text,
  p_from_time timestamptz,
  p_professional_ids uuid[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_service text;
  v_when text;
  v_when_from text;
  v_title text;
  v_message text;
  v_event text;
  v_uid text;
  v_ids uuid[];
  v_person text;
BEGIN
  v_service := public.booking_notification_service_label(p_booking.business_id, p_booking.service_ids);
  v_when := public.format_booking_notification_when(p_booking.appointment_time, p_booking.business_id);
  v_event := p_kind || ':' || p_booking.id::text;
  -- Pedido em grupo: mostra quem será atendido e mantém quem fez o pedido como responsável.
  v_person := COALESCE(NULLIF(btrim(p_booking.customer_name), ''), 'Cliente');
  IF NULLIF(btrim(COALESCE(p_booking.attendee_name, '')), '') IS NOT NULL
     AND btrim(p_booking.attendee_name) IS DISTINCT FROM btrim(COALESCE(p_booking.customer_name, '')) THEN
    v_person := btrim(p_booking.attendee_name) || ' (responsável: ' || v_person || ')';
  END IF;

  IF p_kind = 'edit' THEN
    v_when_from := public.format_booking_notification_when(
      COALESCE(p_from_time, p_booking.original_appointment_time, p_booking.appointment_time),
      p_booking.business_id
    );
    v_title := 'Pedido de alteração';
    v_message := 'Pedido de alteração: ' || v_person
      || ', de ' || v_when_from || ' para ' || v_when;
  ELSIF p_booking.status = 'confirmed' THEN
    -- Confirmado automaticamente (aprovação manual desligada).
    v_title := 'Novo agendamento';
    v_message := 'Novo agendamento online: ' || v_person
      || ', ' || v_service || ', ' || v_when || ' — já está na agenda.';
  ELSE
    v_title := 'Novo pedido';
    v_message := 'Novo pedido: ' || v_person
      || ', ' || v_service || ', ' || v_when;
  END IF;

  PERFORM public.upsert_booking_notification(
    p_booking.business_id, v_title, v_message, p_kind, p_booking.id, v_event, '/agenda'
  );

  v_ids := ARRAY(
    SELECT DISTINCT x
    FROM unnest(COALESCE(p_professional_ids, ARRAY[]::uuid[])) AS x
    WHERE x IS NOT NULL
  );

  FOR v_uid IN
    SELECT DISTINCT tm.staff_user_id::text
    FROM public.team_members tm
    WHERE tm.id = ANY (v_ids)
      AND tm.user_id = p_booking.business_id
      AND tm.active IS TRUE
      AND tm.deleted_at IS NULL
      AND tm.staff_user_id IS NOT NULL
  LOOP
    IF v_uid IS DISTINCT FROM p_booking.business_id THEN
      PERFORM public.upsert_booking_notification(
        v_uid, v_title, v_message, p_kind, p_booking.id, v_event, '/agenda'
      );
    END IF;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_booking_recipients(public.public_bookings, text, timestamptz, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_booking_recipients(public.public_bookings, text, timestamptz, uuid[]) TO service_role;

COMMIT;
