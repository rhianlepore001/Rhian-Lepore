-- Migration: corrige get_public_client_by_phone / upsert_public_client (text = uuid)
-- Data: 2026-09-08
-- Contexto: em produção `public_clients.business_id` é TEXT (FK para profiles.id TEXT),
-- mas as RPCs comparam com o parâmetro UUID e devolvem `business_id UUID`.
-- Resultado: `operator does not exist: text = uuid` (42883) em toda identificação
-- de cliente público — passo "Seus dados" da fila pelo QR, gate da Minha Área e
-- agendamento público. Mesma classe do bug corrigido em
-- 20260906140000_fix_find_active_queue_entry_text_cast.sql.
--
-- Estratégia: manter a assinatura dos parâmetros (o front envia strings e o
-- PostgREST resolve por nome), comparar sempre via ::text e devolver
-- business_id como TEXT (o front trata como string).

DROP FUNCTION IF EXISTS public.get_public_client_by_phone(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.get_public_client_by_phone(
  p_business_id UUID,
  p_phone TEXT
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  photo_url TEXT,
  business_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.email, c.phone, c.photo_url, c.business_id::TEXT
  FROM public.public_clients c
  WHERE c.business_id::TEXT = p_business_id::TEXT
    AND public.phones_match(c.phone, p_phone)
  ORDER BY c.last_booking_at DESC NULLS LAST, c.created_at ASC
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_client_by_phone(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_client_by_phone(UUID, TEXT) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.upsert_public_client(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.upsert_public_client(
  p_business_id UUID,
  p_name TEXT,
  p_phone TEXT,
  p_photo_url TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  photo_url TEXT,
  business_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
BEGIN
  IF p_business_id IS NULL OR NULLIF(trim(p_phone), '') IS NULL THEN
    RAISE EXCEPTION 'Estabelecimento e telefone sao obrigatorios.';
  END IF;

  SELECT c.id INTO v_existing_id
  FROM public.public_clients c
  WHERE c.business_id::TEXT = p_business_id::TEXT
    AND public.phones_match(c.phone, p_phone)
  ORDER BY c.last_booking_at DESC NULLS LAST, c.created_at ASC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- colunas qualificadas por alias: os nomes de saída (name, email, ...) são
    -- variáveis do plpgsql e ficariam ambíguos sem qualificação.
    UPDATE public.public_clients AS pc
    SET
      name = COALESCE(NULLIF(trim(p_name), ''), pc.name),
      photo_url = COALESCE(p_photo_url, pc.photo_url),
      email = COALESCE(p_email, pc.email),
      last_booking_at = NOW()
    WHERE pc.id = v_existing_id;
  ELSE
    IF NULLIF(trim(p_name), '') IS NULL THEN
      RAISE EXCEPTION 'Nome obrigatorio para novo cliente.';
    END IF;

    INSERT INTO public.public_clients AS pc (business_id, name, phone, photo_url, email, last_booking_at)
    -- sem cast: uuid -> text é cast de atribuição; funciona com a coluna TEXT (prod) ou UUID.
    VALUES (p_business_id, trim(p_name), p_phone, p_photo_url, p_email, NOW())
    RETURNING pc.id INTO v_existing_id;
  END IF;

  RETURN QUERY
  SELECT c.id, c.name, c.email, c.phone, c.photo_url, c.business_id::TEXT
  FROM public.public_clients c
  WHERE c.id = v_existing_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_public_client(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_public_client(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
