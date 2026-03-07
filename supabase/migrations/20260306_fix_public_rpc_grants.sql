-- ==========================================================================
-- MIGRATION: Fix RPCs Públicas — GRANTs + Type Mismatch
-- ==========================================================================
-- Corrige:
--   1. get_public_client_by_phone  → adiciona GRANT anon (resolve 404)
--   2. get_active_booking_by_phone → adiciona GRANT anon (resolve 404)
--   3. get_client_bookings_history → corrige comparação business_id TEXT vs UUID (resolve 400)
-- ==========================================================================

-- 1. GRANT para get_public_client_by_phone
-- A função já existe em 20260218_professional_booking_system.sql mas sem GRANT para anon.
GRANT EXECUTE ON FUNCTION get_public_client_by_phone(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_public_client_by_phone(UUID, TEXT) TO authenticated;

-- 2. GRANT para get_active_booking_by_phone
-- A função já existe em 20240107_fix_client_and_booking_rules.sql mas sem GRANT para anon.
GRANT EXECUTE ON FUNCTION get_active_booking_by_phone(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_active_booking_by_phone(TEXT, UUID) TO authenticated;

-- 3. Recriar get_client_bookings_history com cast correto
-- A coluna business_id em public_bookings é TEXT, mas o parâmetro p_business_id é UUID.
-- Sem o cast, o Postgres retorna erro 400 por type mismatch na comparação.
DROP FUNCTION IF EXISTS get_client_bookings_history(TEXT, UUID);

CREATE OR REPLACE FUNCTION get_client_bookings_history(
  p_phone TEXT,
  p_business_id UUID
)
RETURNS TABLE (
  id UUID,
  appointment_time TIMESTAMPTZ,
  status TEXT,
  service_ids UUID[],
  service_names TEXT[],
  professional_id UUID,
  professional_name TEXT,
  total_price DECIMAL,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    pb.id,
    pb.appointment_time,
    pb.status::TEXT,
    pb.service_ids,
    ARRAY(
      SELECT s.name
      FROM services s
      WHERE s.id = ANY(pb.service_ids)
      ORDER BY array_position(pb.service_ids, s.id)
    ) AS service_names,
    pb.professional_id,
    tm.name AS professional_name,
    pb.total_price,
    pb.duration_minutes,
    pb.created_at
  FROM public_bookings pb
  LEFT JOIN team_members tm ON tm.id = pb.professional_id
  WHERE
    pb.customer_phone = p_phone
    AND pb.business_id = p_business_id::TEXT
  ORDER BY pb.appointment_time DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_client_bookings_history(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_client_bookings_history(TEXT, UUID) TO authenticated;
