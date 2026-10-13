-- =============================================================================
-- public_clients: fecha SELECT/INSERT/UPDATE direto por anon (e UPDATE aberto)
-- Spec: docs/specs/crit-public-clients-billing-SPEC.md
-- Rollback: docs/rollbacks/20261013120000_public_clients_anon_lockdown.rollback.sql
--
-- ANTES (prod, lido em 2026-10-13):
--   "Public can select client data"  SELECT TO anon,authenticated USING (true)
--   "Public can update client data"  UPDATE TO anon,authenticated USING/CHECK (true)
--   "Public can register as client"  INSERT TO public WITH CHECK (true)
--   ACL anon = arwdDxtm (tudo)
--   -> qualquer visitante lista/altera PII de todos os negócios.
--
-- AGORA:
--   1. DROP das 3 policies públicas abertas.
--   2. Policies autenticadas por tenant (SELECT company; ALL owner).
--   3. REVOKE de anon em DML (SELECT/INSERT/UPDATE/DELETE/...).
--   4. RPCs SECURITY DEFINER endurecidas (validação + business_exists),
--      search_path fixo; sem enumeração (só match por telefone + business).
--
-- Fluxo público: upsert_public_client / get_public_client_by_phone (já usados
-- pelo front). Dono/staff: SELECT por get_auth_company_id(); dono gerencia ALL.
-- =============================================================================

DROP POLICY IF EXISTS "Public can select client data" ON public.public_clients;
DROP POLICY IF EXISTS "Public can update client data" ON public.public_clients;
DROP POLICY IF EXISTS "Public can register as client" ON public.public_clients;
DROP POLICY IF EXISTS "Owner can manage public_clients" ON public.public_clients;

DROP POLICY IF EXISTS "public_clients_tenant_select" ON public.public_clients;
CREATE POLICY "public_clients_tenant_select"
  ON public.public_clients
  FOR SELECT
  TO authenticated
  USING (business_id = public.get_auth_company_id());

DROP POLICY IF EXISTS "public_clients_owner_all" ON public.public_clients;
CREATE POLICY "public_clients_owner_all"
  ON public.public_clients
  FOR ALL
  TO authenticated
  USING (
    business_id = public.get_auth_company_id()
    AND COALESCE(public.get_auth_role(), 'owner') = 'owner'
  )
  WITH CHECK (
    business_id = public.get_auth_company_id()
    AND COALESCE(public.get_auth_role(), 'owner') = 'owner'
  );

REVOKE ALL ON TABLE public.public_clients FROM anon;
-- authenticated mantém SELECT/INSERT/UPDATE/DELETE (policies acima filtram).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.public_clients TO authenticated;
GRANT ALL ON TABLE public.public_clients TO service_role;

CREATE OR REPLACE FUNCTION public.get_public_client_by_phone(
  p_business_id uuid,
  p_phone text
)
RETURNS TABLE (
  id uuid,
  name character varying,
  email character varying,
  phone character varying,
  photo_url text,
  business_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_digits text;
BEGIN
  IF p_business_id IS NULL THEN
    RAISE EXCEPTION 'business_required';
  END IF;
  v_digits := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  IF length(v_digits) < 8 THEN
    RAISE EXCEPTION 'phone_invalid';
  END IF;
  IF NOT public.business_exists(p_business_id::text) THEN
    RAISE EXCEPTION 'business_not_found';
  END IF;

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
GRANT EXECUTE ON FUNCTION public.get_public_client_by_phone(uuid, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.upsert_public_client(
  p_business_id uuid,
  p_name text,
  p_phone text,
  p_photo_url text DEFAULT NULL,
  p_email text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name character varying,
  email character varying,
  phone character varying,
  photo_url text,
  business_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_id uuid;
  v_digits text;
  v_name text;
  v_email text;
  v_photo text;
BEGIN
  IF p_business_id IS NULL THEN
    RAISE EXCEPTION 'business_required';
  END IF;
  v_digits := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  IF length(v_digits) < 8 THEN
    RAISE EXCEPTION 'phone_invalid';
  END IF;
  IF NOT public.business_exists(p_business_id::text) THEN
    RAISE EXCEPTION 'business_not_found';
  END IF;

  v_name := NULLIF(btrim(COALESCE(p_name, '')), '');
  IF v_name IS NOT NULL AND char_length(v_name) > 80 THEN
    RAISE EXCEPTION 'name_too_long';
  END IF;
  v_email := NULLIF(btrim(COALESCE(p_email, '')), '');
  IF v_email IS NOT NULL AND char_length(v_email) > 254 THEN
    RAISE EXCEPTION 'email_invalid';
  END IF;
  v_photo := NULLIF(btrim(COALESCE(p_photo_url, '')), '');
  IF v_photo IS NOT NULL AND char_length(v_photo) > 2000 THEN
    RAISE EXCEPTION 'photo_url_invalid';
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
      name = COALESCE(v_name, pc.name),
      photo_url = COALESCE(v_photo, pc.photo_url),
      email = COALESCE(v_email, pc.email),
      last_booking_at = NOW()
    WHERE pc.id = v_existing_id;
  ELSE
    IF v_name IS NULL THEN
      RAISE EXCEPTION 'Nome obrigatorio para novo cliente.';
    END IF;
    INSERT INTO public.public_clients AS pc (business_id, name, phone, photo_url, email, last_booking_at)
    VALUES (p_business_id, v_name, p_phone, v_photo, v_email, NOW())
    RETURNING pc.id INTO v_existing_id;
  END IF;

  RETURN QUERY
  SELECT c.id, c.name, c.email, c.phone, c.photo_url, c.business_id::TEXT
  FROM public.public_clients c
  WHERE c.id = v_existing_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.upsert_public_client(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_public_client(uuid, text, text, text, text) TO anon, authenticated, service_role;
