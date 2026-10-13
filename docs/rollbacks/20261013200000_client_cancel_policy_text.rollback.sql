-- ROLLBACK exato de 20261013200000_client_cancel_policy_text.
-- Restaura get_public_business_settings_json com o corpo de prod de 2026-10-12
-- (md5 de pg_get_functiondef 5422761fd6983134c8b03b144c24d542) e remove a coluna.
-- Os textos personalizados salvos se perdem; o front volta a mostrar o texto gerado.
-- Reverter o frontend ANTES. Idempotente.

BEGIN;

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
    'timezone', public.business_timezone(p_business_id::text),
    'client_cancel_cutoff_hours', COALESCE(bs.client_cancel_cutoff_hours, 2),
    'client_cancel_note', bs.client_cancel_note,
    'online_booking_auto_confirm', NOT COALESCE(bs.online_booking_requires_approval, true)
  )
  INTO v_result
  FROM public.business_settings bs
  WHERE bs.user_id::text = p_business_id::text
  LIMIT 1;

  RETURN v_result;
END;
$function$;

ALTER TABLE public.business_settings DROP CONSTRAINT IF EXISTS client_cancel_policy_text_length;
ALTER TABLE public.business_settings DROP COLUMN IF EXISTS client_cancel_policy_text;

COMMIT;
