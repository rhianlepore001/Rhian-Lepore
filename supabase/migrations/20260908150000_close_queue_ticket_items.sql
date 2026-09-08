-- Comanda deixada em aberto guarda os itens adicionados (serviços extras / produtos)
-- para que apareçam de novo ao finalizar. Antes, "Deixar em aberto" descartava os extras.

ALTER TABLE public.queue_entries
  ADD COLUMN IF NOT EXISTS ticket_items JSONB;

DROP FUNCTION IF EXISTS public.close_queue_ticket(UUID);

CREATE OR REPLACE FUNCTION public.close_queue_ticket(
  p_entry_id UUID,
  p_items JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant TEXT := public.queue_tenant_id();
  v_entry public.queue_entries%ROWTYPE;
BEGIN
  SELECT * INTO v_entry
  FROM public.queue_entries
  WHERE id = p_entry_id AND business_id::TEXT = v_tenant
  FOR UPDATE;

  IF NOT FOUND OR v_entry.status <> 'serving' THEN
    RAISE EXCEPTION 'Apenas entradas em atendimento podem fechar comanda.';
  END IF;

  IF p_items IS NOT NULL AND jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Itens da comanda inválidos.';
  END IF;

  UPDATE public.queue_entries
  SET status = 'completed',
      ticket_status = 'open',
      ticket_items = CASE WHEN p_items IS NULL OR p_items = '[]'::jsonb THEN NULL ELSE p_items END,
      closed_at = NOW(),
      closed_by = auth.uid()
  WHERE id = p_entry_id;
END;
$$;

REVOKE ALL ON FUNCTION public.close_queue_ticket(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_queue_ticket(UUID, JSONB) TO authenticated;
