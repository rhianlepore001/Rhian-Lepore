-- Área do cliente: ler e cancelar assinatura do clube (público, por telefone + estabelecimento)
-- SECURITY DEFINER; sem abrir policy anon nas tabelas. Mesmo padrão de get_public_membership_plans.

CREATE OR REPLACE FUNCTION public.get_public_client_membership(
  p_business_id TEXT,
  p_phone TEXT
)
RETURNS TABLE (
  membership_id UUID,
  stored_status TEXT,
  effective_status TEXT,
  plan_id UUID,
  plan_name TEXT,
  plan_description TEXT,
  price_cents INTEGER,
  badge_color TEXT,
  service_ids UUID[],
  service_names TEXT[],
  usage_limit_per_month INTEGER,
  usage_this_period INTEGER,
  starts_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  next_billing_at TIMESTAMPTZ,
  last_paid_at TIMESTAMPTZ,
  payment_method TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone TEXT;
  v_client_id UUID;
BEGIN
  v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  IF length(v_phone) < 9 THEN
    RETURN;
  END IF;

  SELECT c.id INTO v_client_id
  FROM clients c
  WHERE c.user_id::text = p_business_id
    AND public.phones_match(c.phone, v_phone)
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    cm.id,
    cm.status,
    CASE
      WHEN cm.status = 'active'
        AND cm.next_billing_at IS NOT NULL
        AND cm.next_billing_at < NOW()
      THEN 'overdue'::TEXT
      ELSE cm.status
    END,
    mp.id,
    mp.name,
    mp.description,
    mp.price_cents,
    mp.badge_color,
    mp.service_ids,
    ARRAY(
      SELECT s.name
      FROM services s
      WHERE s.id = ANY (mp.service_ids)
      ORDER BY array_position(mp.service_ids, s.id)
    ),
    mp.usage_limit_per_month,
    (
      SELECT COUNT(*)::INTEGER
      FROM appointments a
      WHERE a.client_id = cm.client_id
        AND a.user_id::text = p_business_id
        AND a.status = 'Completed'
        AND LOWER(COALESCE(a.payment_method, '')) = 'membership'
        AND (cm.current_period_start IS NULL OR a.appointment_time >= cm.current_period_start)
        AND (cm.current_period_end IS NULL OR a.appointment_time < cm.current_period_end)
    ),
    cm.starts_at,
    cm.current_period_start,
    cm.current_period_end,
    cm.next_billing_at,
    cm.last_paid_at,
    cm.payment_method
  FROM client_memberships cm
  JOIN membership_plans mp ON mp.id = cm.plan_id
  WHERE cm.user_id = p_business_id
    AND cm.client_id = v_client_id
  ORDER BY cm.created_at DESC
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_public_client_membership(
  p_business_id TEXT,
  p_phone TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone TEXT;
  v_client_id UUID;
  v_membership_id UUID;
BEGIN
  v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  IF length(v_phone) < 9 THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;

  SELECT c.id INTO v_client_id
  FROM clients c
  WHERE c.user_id::text = p_business_id
    AND public.phones_match(c.phone, v_phone)
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'membership_not_found';
  END IF;

  SELECT cm.id INTO v_membership_id
  FROM client_memberships cm
  WHERE cm.user_id = p_business_id
    AND cm.client_id = v_client_id
    AND cm.status IN ('pending', 'active', 'overdue')
  ORDER BY cm.created_at DESC
  LIMIT 1;

  IF v_membership_id IS NULL THEN
    RAISE EXCEPTION 'membership_not_found';
  END IF;

  UPDATE client_memberships
  SET
    status = 'cancelled',
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE id = v_membership_id
    AND user_id = p_business_id;

  RETURN v_membership_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_client_membership(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_public_client_membership(TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_public_client_membership(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_public_client_membership(TEXT, TEXT) TO anon, authenticated;
