-- Migration: Área do Cliente — RPC de histórico de agendamentos
-- US-014: Portal pós-agendamento para clientes públicos

-- Busca histórico completo de agendamentos do cliente (futuros + passados)
-- Usado pela página /minha-area/:slug
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
    tm.full_name AS professional_name,
    pb.total_price,
    pb.duration_minutes,
    pb.created_at
  FROM public_bookings pb
  LEFT JOIN team_members tm ON tm.id = pb.professional_id
  WHERE
    pb.customer_phone = p_phone
    AND pb.business_id = p_business_id
  ORDER BY pb.appointment_time DESC;
END;
$$;

-- Permissão: função pode ser chamada por usuários anônimos (cliente público)
GRANT EXECUTE ON FUNCTION get_client_bookings_history(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_client_bookings_history(TEXT, UUID) TO authenticated;
