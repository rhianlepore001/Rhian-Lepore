-- ============================================================================
-- RPCs públicos do Clube de Assinatura (fluxo /clube sem login)
--
-- Contexto: a página pública JoinClub usava hooks autenticados — cliente
-- deslogado nunca via os planos, e um usuário logado de OUTRO tenant via os
-- planos/chave Pix da própria conta sob o link de outro estabelecimento.
--
-- Padrão: SECURITY DEFINER escopado por p_business_id (mesmo desenho de
-- get_queue_entry_public / get_public_profile_by_slug). Nenhuma policy anon
-- é aberta nas tabelas.
-- ============================================================================

-- 1. Planos ativos do estabelecimento (leitura pública)
CREATE OR REPLACE FUNCTION get_public_membership_plans(p_business_id TEXT)
RETURNS SETOF membership_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT mp.*
  FROM membership_plans mp
  WHERE mp.user_id = p_business_id
    AND mp.active = true
  ORDER BY mp.price_cents ASC;
END;
$$;

-- 2. Config Pix do estabelecimento (dados de recebimento exibidos ao pagador)
CREATE OR REPLACE FUNCTION get_public_pix_config(p_business_id TEXT)
RETURNS TABLE (
  pix_key_type      TEXT,
  pix_key_value     TEXT,
  pix_holder_name   TEXT,
  pix_merchant_city TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT bs.pix_key_type, bs.pix_key_value, bs.pix_holder_name, bs.pix_merchant_city
  FROM business_settings bs
  WHERE bs.user_id = p_business_id
  LIMIT 1;
END;
$$;

-- 3. Solicitação pública de assinatura (resolve/cria cliente + membership pending)
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
BEGIN
  v_phone := regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g');
  IF length(v_phone) < 9 THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;
  IF length(trim(coalesce(p_client_name, ''))) < 2 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;
  IF p_payment_method NOT IN ('pix', 'in_person') THEN
    RAISE EXCEPTION 'invalid_payment_method';
  END IF;

  PERFORM 1 FROM membership_plans
  WHERE id = p_plan_id AND user_id = p_business_id AND active = true;
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

  PERFORM 1 FROM client_memberships
  WHERE user_id = p_business_id
    AND client_id = v_client_id
    AND status IN ('pending', 'active');
  IF FOUND THEN
    RAISE EXCEPTION 'membership_already_exists';
  END IF;

  INSERT INTO client_memberships (user_id, client_id, plan_id, status, payment_method, starts_at)
  VALUES (p_business_id, v_client_id, p_plan_id, 'pending', p_payment_method, NOW())
  RETURNING id INTO v_membership_id;

  RETURN v_membership_id;
END;
$$;

-- 4. Registro público do Pix gerado (valor sempre do plano, nunca do cliente)
CREATE OR REPLACE FUNCTION create_public_pix_payment(
  p_business_id   TEXT,
  p_membership_id UUID,
  p_br_code       TEXT,
  p_txid          TEXT,
  p_expires_at    TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount INTEGER;
  v_id     UUID;
BEGIN
  SELECT mp.price_cents INTO v_amount
  FROM client_memberships cm
  JOIN membership_plans mp ON mp.id = cm.plan_id
  WHERE cm.id = p_membership_id
    AND cm.user_id = p_business_id
    AND cm.status = 'pending';

  IF v_amount IS NULL THEN
    RAISE EXCEPTION 'membership_not_found';
  END IF;

  INSERT INTO pix_payments (user_id, membership_id, amount_cents, br_code, txid, status, expires_at)
  VALUES (p_business_id, p_membership_id, v_amount, p_br_code, p_txid, 'pending', p_expires_at)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION get_public_membership_plans(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_public_pix_config(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_public_membership_request(TEXT, TEXT, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_public_pix_payment(TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_public_membership_plans(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_pix_config(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_public_membership_request(TEXT, TEXT, TEXT, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_public_pix_payment(TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ) TO anon, authenticated;
