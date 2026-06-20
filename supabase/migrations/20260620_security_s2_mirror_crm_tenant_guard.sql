-- ==========================================================================
-- SECURITY S2 (patch): mirror_public_client_to_crm — guarda de tenant
-- ==========================================================================
-- Contexto: 20260613_security_s2_public_rls.sql revogou o GRANT de anon e passou
-- a chamar esta função via trigger server-side (trg_mirror_public_client_to_crm).
-- Porém o GRANT a `authenticated` permanece, e a função aceita `p_user_id` (tenant
-- alvo) como PARÂMETRO sem validar contra a sessão. Isso permitia que um usuário
-- autenticado do tenant A injetasse/sobrescrevesse um cliente no CRM do tenant B
-- (escrita cross-tenant — não leitura).
--
-- Correção: rejeitar quando a sessão TEM um tenant autenticado e ele difere de
-- p_user_id. O caminho legítimo (trigger em contexto anon, sem tenant na sessão)
-- continua funcionando, pois aí o tenant da sessão é NULL e a guarda não dispara.
-- ==========================================================================

CREATE OR REPLACE FUNCTION mirror_public_client_to_crm(
  p_user_id   TEXT,
  p_name      TEXT,
  p_phone     TEXT,
  p_email     TEXT DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_tenant TEXT := COALESCE(get_auth_company_id(), auth.uid()::text);
BEGIN
  IF p_user_id IS NULL OR trim(p_user_id) = '' THEN
    RAISE EXCEPTION 'mirror_public_client_to_crm: p_user_id é obrigatório';
  END IF;
  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RAISE EXCEPTION 'mirror_public_client_to_crm: p_phone é obrigatório';
  END IF;

  -- Guarda de tenant: sessão autenticada só pode espelhar para o próprio tenant.
  -- Em contexto anon (trigger do fluxo público), v_caller_tenant é NULL e a guarda
  -- não dispara — preservando o espelhamento legítimo.
  IF v_caller_tenant IS NOT NULL AND v_caller_tenant <> p_user_id THEN
    RAISE EXCEPTION 'mirror_public_client_to_crm: tenant_mismatch';
  END IF;

  INSERT INTO clients (user_id, name, phone, email, photo_url, source)
  VALUES (p_user_id, p_name, p_phone, p_email, p_photo_url, 'agendamento_online')
  ON CONFLICT (user_id, phone) DO UPDATE
    SET
      name      = EXCLUDED.name,
      email     = COALESCE(EXCLUDED.email, clients.email),
      photo_url = COALESCE(EXCLUDED.photo_url, clients.photo_url),
      source    = 'agendamento_online';
END;
$$;

-- Grants permanecem como após o S2: anon revogado, authenticated mantido
-- (a guarda acima é que protege o caminho autenticado).
REVOKE EXECUTE ON FUNCTION mirror_public_client_to_crm(TEXT, TEXT, TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION mirror_public_client_to_crm(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
