-- queue_entries.business_id é TEXT (profiles.id). A RPC comparava UUID = TEXT e
-- quebrava para o cliente anônimo; o painel do gestor não usa esta função.

CREATE OR REPLACE FUNCTION public.find_active_queue_entry_by_phone(
  p_business_id UUID,
  p_phone       TEXT
)
RETURNS SETOF public.queue_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT qe.*
  FROM public.queue_entries qe
  WHERE qe.business_id = p_business_id::text
    AND qe.status IN ('waiting', 'calling', 'serving')
    AND public.phones_match(qe.client_phone, p_phone)
  ORDER BY qe.joined_at DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_active_queue_entry_by_phone(UUID, TEXT) TO anon, authenticated;
