-- ROLLBACK de 20261004083800_client_cancel_cutoff
-- Idempotente. Não toca #120 (reschedule), #121 (lead time), #122 (broadcast)
-- nem #123 (completed/no_show / get_client_bookings_history_v2 / outcome).
-- Restaura get_public_business_settings_json exatamente como em
-- 20260925120000_business_timezone (definição anterior a este PR).
--
-- ANTES de aplicar: reverter o frontend (Minha Área chama
-- cancel_public_booking_by_client_v2; a página pública lê
-- client_cancel_cutoff_hours / client_cancel_note no JSON). Sem o revert,
-- cancelar na área do cliente quebra.

BEGIN;

DROP FUNCTION IF EXISTS public.cancel_public_booking_by_client_v2(uuid, text);

ALTER TABLE public.business_settings
  DROP CONSTRAINT IF EXISTS client_cancel_cutoff_hours_allowed;
ALTER TABLE public.business_settings
  DROP CONSTRAINT IF EXISTS client_cancel_note_length;
ALTER TABLE public.business_settings
  DROP COLUMN IF EXISTS client_cancel_cutoff_hours;
ALTER TABLE public.business_settings
  DROP COLUMN IF EXISTS client_cancel_note;

CREATE OR REPLACE FUNCTION public.get_public_business_settings_json(p_business_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'business_hours', bs.business_hours,
    'cancellation_policy', bs.cancellation_policy,
    'enable_self_rescheduling', bs.enable_self_rescheduling,
    'public_products_enabled', bs.public_products_enabled,
    'queue_mode', bs.queue_mode,
    'queue_allow_leave', bs.queue_allow_leave,
    'queue_late_minutes', bs.queue_late_minutes,
    'timezone', public.business_timezone(p_business_id::text)
  )
  INTO v_result
  FROM public.business_settings bs
  WHERE bs.user_id::text = p_business_id::text
  LIMIT 1;

  RETURN v_result;
END;
$function$;

COMMIT;
