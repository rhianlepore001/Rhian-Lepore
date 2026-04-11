-- ==========================================================================
-- Migration: Fix espelhamento CRM + coluna enable_self_rescheduling
-- Data: 2026-04-05
-- Problemas corrigidos:
--   1. business_settings não tinha coluna enable_self_rescheduling →
--      ClientArea.tsx recebia erro 400 e usava fallback sempre-true
--   2. PublicClientContext fazia upsert direto em 'clients' como role anon →
--      RLS bloqueava silenciosamente (policy usa auth.uid() = NULL para anon)
--      Solução: RPC SECURITY DEFINER que executa com privilégios do owner
-- ==========================================================================

-- Fix 1: Coluna enable_self_rescheduling em business_settings
ALTER TABLE business_settings
  ADD COLUMN IF NOT EXISTS enable_self_rescheduling BOOLEAN DEFAULT true;

COMMENT ON COLUMN business_settings.enable_self_rescheduling IS
  'Permite que clientes públicos reagendem/cancelem seus próprios agendamentos via área do cliente';

-- Fix 2: RPC SECURITY DEFINER para espelhamento seguro de clientes públicos no CRM
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
BEGIN
  IF p_user_id IS NULL OR trim(p_user_id) = '' THEN
    RAISE EXCEPTION 'mirror_public_client_to_crm: p_user_id é obrigatório';
  END IF;
  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RAISE EXCEPTION 'mirror_public_client_to_crm: p_phone é obrigatório';
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

GRANT EXECUTE ON FUNCTION mirror_public_client_to_crm(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION mirror_public_client_to_crm(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
