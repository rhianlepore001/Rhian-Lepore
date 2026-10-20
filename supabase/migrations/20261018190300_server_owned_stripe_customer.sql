BEGIN;
SET LOCAL lock_timeout = '5s';

REVOKE ALL ON FUNCTION public.set_stripe_customer_id_for_caller(text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_stripe_customer_id_for_user(
  p_user_id uuid,
  p_customer_id text
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_customer_id IS NULL OR p_customer_id !~ '^cus_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'invalid_customer_binding' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id::text
  FOR UPDATE;

  IF NOT FOUND OR v_profile.role IS DISTINCT FROM 'owner'
     OR COALESCE(NULLIF(btrim(v_profile.company_id), ''), v_profile.id) IS DISTINCT FROM v_profile.id THEN
    RAISE EXCEPTION 'owner_required' USING ERRCODE = '42501';
  END IF;

  IF v_profile.stripe_customer_id IS NOT NULL THEN
    IF v_profile.stripe_customer_id IS DISTINCT FROM p_customer_id THEN
      RAISE EXCEPTION 'customer_binding_conflict' USING ERRCODE = '23505';
    END IF;
    RETURN v_profile.stripe_customer_id;
  END IF;

  UPDATE public.profiles
  SET stripe_customer_id = p_customer_id, updated_at = now()
  WHERE id = p_user_id::text;

  RETURN p_customer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_stripe_customer_id_for_user(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_stripe_customer_id_for_user(uuid, text) TO service_role;

COMMIT;
