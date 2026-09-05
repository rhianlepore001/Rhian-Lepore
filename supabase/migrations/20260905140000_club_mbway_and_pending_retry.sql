-- Clube: MB WAY para contas PT/euro, Pix permanece BR.
-- Também reabre membership pending no retry (não bloqueia o cliente
-- se o QR falhou depois do insert) e alarga as constraints de método.

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS mbway_phone TEXT,
  ADD COLUMN IF NOT EXISTS mbway_holder_name TEXT;

ALTER TABLE public.client_memberships DROP CONSTRAINT IF EXISTS client_memberships_payment_method_check;
ALTER TABLE public.client_memberships
  ADD CONSTRAINT client_memberships_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('pix', 'cash', 'card', 'in_person', 'mbway'));

ALTER TABLE public.membership_payments DROP CONSTRAINT IF EXISTS membership_payments_method_check;
ALTER TABLE public.membership_payments
  ADD CONSTRAINT membership_payments_method_check
  CHECK (method IN ('pix', 'cash', 'card', 'mbway'));

DROP FUNCTION IF EXISTS get_public_pix_config(TEXT);

CREATE FUNCTION get_public_pix_config(p_business_id TEXT)
RETURNS TABLE (
  pix_key_type      TEXT,
  pix_key_value     TEXT,
  pix_holder_name   TEXT,
  pix_merchant_city TEXT,
  mbway_phone       TEXT,
  mbway_holder_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bs.pix_key_type,
    bs.pix_key_value,
    bs.pix_holder_name,
    bs.pix_merchant_city,
    bs.mbway_phone,
    bs.mbway_holder_name
  FROM business_settings bs
  WHERE bs.user_id::text = p_business_id
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION create_public_membership_request(
  p_business_id    TEXT,
  p_client_name    TEXT,
  p_client_phone   TEXT,
  p_plan_id        UUID,
  p_payment_method TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone         TEXT;
  v_client_id     UUID;
  v_membership_id UUID;
  v_status        TEXT;
BEGIN
  v_phone := regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g');
  IF length(v_phone) < 9 THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;
  IF length(trim(coalesce(p_client_name, ''))) < 2 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;
  IF p_payment_method NOT IN ('pix', 'in_person', 'mbway') THEN
    RAISE EXCEPTION 'invalid_payment_method';
  END IF;

  PERFORM 1 FROM membership_plans
  WHERE id = p_plan_id AND user_id::text = p_business_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'plan_not_found';
  END IF;

  SELECT c.id INTO v_client_id
  FROM clients c
  WHERE c.user_id = p_business_id::uuid
    AND public.phones_match(c.phone, v_phone)
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO clients (user_id, name, phone)
    VALUES (p_business_id::uuid, trim(p_client_name), v_phone)
    RETURNING id INTO v_client_id;
  END IF;

  SELECT cm.id, cm.status
    INTO v_membership_id, v_status
  FROM client_memberships cm
  WHERE cm.user_id = p_business_id
    AND cm.client_id = v_client_id
    AND cm.status IN ('pending', 'active')
  LIMIT 1;

  IF v_membership_id IS NOT NULL THEN
    IF v_status = 'pending' THEN
      UPDATE client_memberships
         SET payment_method = p_payment_method
       WHERE id = v_membership_id
         AND user_id = p_business_id;
      RETURN v_membership_id;
    END IF;
    RAISE EXCEPTION 'membership_already_exists';
  END IF;

  INSERT INTO client_memberships (user_id, client_id, plan_id, status, payment_method, starts_at)
  VALUES (p_business_id, v_client_id, p_plan_id, 'pending', p_payment_method, NOW())
  RETURNING id INTO v_membership_id;

  RETURN v_membership_id;
END;
$$;

REVOKE ALL ON FUNCTION get_public_pix_config(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_public_membership_request(TEXT, TEXT, TEXT, UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_public_pix_config(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_public_membership_request(TEXT, TEXT, TEXT, UUID, TEXT) TO anon, authenticated;
