-- ROLLBACK de 20261013103422_public_clients_anon_lockdown
-- Restaura policies/ACL/RPCs de prod (2026-10-13). Idempotente.

GRANT ALL ON TABLE public.public_clients TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "public_clients_tenant_select" ON public.public_clients;
DROP POLICY IF EXISTS "public_clients_owner_all" ON public.public_clients;
DROP POLICY IF EXISTS "Owner can manage public_clients" ON public.public_clients;
DROP POLICY IF EXISTS "Public can register as client" ON public.public_clients;
DROP POLICY IF EXISTS "Public can select client data" ON public.public_clients;
DROP POLICY IF EXISTS "Public can update client data" ON public.public_clients;

CREATE POLICY "Owner can manage public_clients"
  ON public.public_clients
  FOR ALL
  TO public
  USING (((auth.uid())::text = business_id))
  WITH CHECK (((auth.uid())::text = business_id));

CREATE POLICY "Public can register as client"
  ON public.public_clients
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can select client data"
  ON public.public_clients
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can update client data"
  ON public.public_clients
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Corpos de prod (md5 get=6c02fd38… upsert=1cf77ca8…), 2026-10-13.
CREATE OR REPLACE FUNCTION public.get_public_client_by_phone(p_business_id uuid, p_phone text)
 RETURNS TABLE(id uuid, name character varying, email character varying, phone character varying, photo_url text, business_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.email, c.phone, c.photo_url, c.business_id::TEXT
  FROM public.public_clients c
  WHERE c.business_id::TEXT = p_business_id::TEXT
    AND public.phones_match(c.phone, p_phone)
  ORDER BY c.last_booking_at DESC NULLS LAST, c.created_at ASC
  LIMIT 1;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_public_client_by_phone(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_client_by_phone(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.upsert_public_client(p_business_id uuid, p_name text, p_phone text, p_photo_url text DEFAULT NULL::text, p_email text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, name character varying, email character varying, phone character varying, photo_url text, business_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    VALUES (p_business_id, trim(p_name), p_phone, p_photo_url, p_email, NOW())
    RETURNING pc.id INTO v_existing_id;
  END IF;

  RETURN QUERY
  SELECT c.id, c.name, c.email, c.phone, c.photo_url, c.business_id::TEXT
  FROM public.public_clients c
  WHERE c.id = v_existing_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.upsert_public_client(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_public_client(uuid, text, text, text, text) TO anon, authenticated;
