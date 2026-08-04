-- Hardening CRM v2: staff não gerencia ficha completa; anon não executa get_client_profile.
-- Agenda continua podendo SELECT + INSERT (cadastro rápido). UPDATE/DELETE ficam com o dono.

-- 1) Remover FOR ALL que dava a staff o mesmo poder do dono via get_auth_company_id()
DROP POLICY IF EXISTS "Clients: company isolation" ON public.clients;

-- 2) Staff: leitura da base da empresa (Agenda / seleção de cliente)
DROP POLICY IF EXISTS "Staff can read company clients" ON public.clients;
CREATE POLICY "Staff can select company clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    get_auth_role() = 'staff'
    AND user_id = get_auth_company_id()
  );

-- 3) Staff: criar cliente na Agenda (sem editar notes/birth_date/LTV depois)
DROP POLICY IF EXISTS "Staff can insert company clients" ON public.clients;
CREATE POLICY "Staff can insert company clients"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_auth_role() = 'staff'
    AND user_id = get_auth_company_id()
  );

-- 4) Dono: gerenciar clientes do tenant (além da policy user_id = auth.uid())
DROP POLICY IF EXISTS "Owners manage company clients" ON public.clients;
CREATE POLICY "Owners manage company clients"
  ON public.clients
  FOR ALL
  TO authenticated
  USING (
    COALESCE(get_auth_role(), 'owner') = 'owner'
    AND user_id = get_auth_company_id()
  )
  WITH CHECK (
    COALESCE(get_auth_role(), 'owner') = 'owner'
    AND user_id = get_auth_company_id()
  );

-- 5) RPC de perfil CRM: não executável por anon (filtra por auth.uid(); ainda assim fecha superfície)
REVOKE ALL ON FUNCTION public.get_client_profile(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_client_profile(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_client_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_profile(uuid) TO service_role;
