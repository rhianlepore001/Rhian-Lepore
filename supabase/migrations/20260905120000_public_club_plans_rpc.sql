-- Reaplica RPCs públicos do Clube com comparação em texto (user_id TEXT).
-- Já aplicadas no banco de produção em 2026-09-05 via CREATE OR REPLACE.

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
  WHERE mp.user_id::text = p_business_id
    AND mp.active = true
  ORDER BY mp.price_cents ASC;
END;
$$;

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
  WHERE bs.user_id::text = p_business_id
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION get_public_membership_plans(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_public_pix_config(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_public_membership_plans(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_pix_config(TEXT) TO anon, authenticated;
