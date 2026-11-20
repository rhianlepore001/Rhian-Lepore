BEGIN;

REVOKE EXECUTE ON FUNCTION public.set_stripe_customer_id_for_caller(text)
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.apply_stripe_billing_event(
  p_event_id text,
  p_event_type text,
  p_livemode boolean,
  p_event_at timestamptz,
  p_profile_id text,
  p_subscription_id text,
  p_patch jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_subscription_owner text;
  v_profile_id text;
BEGIN
  INSERT INTO public.stripe_webhook_events (event_id, event_type, livemode)
  VALUES (p_event_id, p_event_type, p_livemode)
  ON CONFLICT (event_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN 'duplicate';
  END IF;

  SELECT p.id INTO v_subscription_owner
  FROM public.profiles p
  WHERE p.stripe_subscription_id = p_subscription_id;

  IF p_profile_id IS NOT NULL AND v_subscription_owner IS NOT NULL
    AND p_profile_id <> v_subscription_owner THEN
    RETURN 'profile_conflict';
  END IF;

  v_profile_id := COALESCE(p_profile_id, v_subscription_owner);
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_profile_id AND p.role = 'owner') THEN
    RETURN 'profile_not_found';
  END IF;

  UPDATE public.profiles AS p
  SET subscription_status = COALESCE(p_patch->>'subscription_status', p.subscription_status),
      subscription_plan = COALESCE(p_patch->>'subscription_plan', p.subscription_plan),
      stripe_customer_id = COALESCE(p_patch->>'stripe_customer_id', p.stripe_customer_id),
      stripe_subscription_id = COALESCE(p_patch->>'stripe_subscription_id', p.stripe_subscription_id),
      subscription_current_period_end = CASE
        WHEN p_patch ? 'subscription_current_period_end' THEN (p_patch->>'subscription_current_period_end')::timestamptz
        ELSE p.subscription_current_period_end
      END,
      stripe_billing_event_at = p_event_at,
      updated_at = now()
  WHERE p.id = v_profile_id
    AND p.role = 'owner'
    AND (p.stripe_billing_event_at IS NULL OR p.stripe_billing_event_at <= p_event_at);

  IF FOUND THEN
    RETURN 'ok';
  END IF;
  RETURN 'stale_event';
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_stripe_billing_event(text, text, boolean, timestamptz, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_stripe_billing_event(text, text, boolean, timestamptz, text, text, jsonb)
  TO service_role;

COMMIT;
