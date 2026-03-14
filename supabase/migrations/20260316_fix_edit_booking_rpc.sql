-- ============================================================
-- MIGRATION: Cria RPC get_booking_by_id para fluxo de edição
-- ============================================================
-- Chamado em: PublicBooking.tsx linha 152
-- Busca um agendamento público pelo ID (vindo do param ?edit=ID)
-- e valida o telefone do cliente para segurança.
-- ============================================================

DROP FUNCTION IF EXISTS get_booking_by_id(UUID, TEXT);

CREATE OR REPLACE FUNCTION get_booking_by_id(
  p_booking_id UUID,
  p_phone      TEXT
)
RETURNS SETOF public_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public_bookings
  WHERE id = p_booking_id
    AND (
      -- Aceita telefone com ou sem formatação (somente dígitos)
      phone = p_phone
      OR regexp_replace(phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')
    )
    AND status IN ('pending', 'confirmed')
  LIMIT 1;
END;
$$;

-- Permissões de acesso público (página de booking, sem autenticação)
GRANT EXECUTE ON FUNCTION get_booking_by_id(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_booking_by_id(UUID, TEXT) TO authenticated;
