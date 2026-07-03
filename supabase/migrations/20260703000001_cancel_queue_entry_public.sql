-- ============================================================================
-- Cancelamento público de entrada na fila (botão "Sair da Fila")
-- Mesmo padrão de prova de telefone do get_queue_entry_public:
-- o cliente só cancela a própria entrada, validada por phones_match.
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_queue_entry_public(
  p_entry_id UUID,
  p_phone    TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INT;
BEGIN
  UPDATE queue_entries qe
  SET status = 'cancelled',
      called_at = NULL
  WHERE qe.id = p_entry_id
    AND public.phones_match(qe.client_phone, p_phone)
    AND qe.status IN ('waiting', 'calling');

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION cancel_queue_entry_public(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cancel_queue_entry_public(UUID, TEXT) TO anon, authenticated;
