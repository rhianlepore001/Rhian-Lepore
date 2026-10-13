-- Política de cancelamento editável pelo gestor (Settings > Negócio > Agendamento).
-- Aditivo:
--   1) business_settings.client_cancel_policy_text text NULL (≤ 300 caracteres).
--      NULL ou só espaços = usar o texto gerado da regra (client_cancel_cutoff_hours),
--      que continua sendo o padrão/"restaurar padrão" no frontend.
--   2) get_public_business_settings_json passa a devolver também
--      'client_cancel_policy_text'. Mesmo corpo de prod (md5 5422761fd6983134c8b03b144c24d542,
--      2026-10-12) + uma chave. Assinatura, SECURITY DEFINER, search_path, dono e ACL
--      iguais (CREATE OR REPLACE mantém ACL). Nenhuma outra coluna exposta.
-- Texto puro: o frontend renderiza como texto React (sem HTML).
--
-- ROLLBACK: docs/rollbacks/20261013200000_client_cancel_policy_text.rollback.sql
-- Reverter o frontend ANTES do rollback (o front trata chave ausente como "usar o gerado").

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS client_cancel_policy_text text;

ALTER TABLE public.business_settings
  DROP CONSTRAINT IF EXISTS client_cancel_policy_text_length;
ALTER TABLE public.business_settings
  ADD CONSTRAINT client_cancel_policy_text_length
  CHECK (client_cancel_policy_text IS NULL OR char_length(client_cancel_policy_text) <= 300);

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
    'client_cancel_policy_text', NULLIF(btrim(bs.client_cancel_policy_text), ''),
    'online_booking_auto_confirm', NOT COALESCE(bs.online_booking_requires_approval, true)
  )
  INTO v_result
  FROM public.business_settings bs
  WHERE bs.user_id::text = p_business_id::text
  LIMIT 1;

  RETURN v_result;
END;
$function$;
