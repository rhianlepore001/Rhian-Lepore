-- P0: revoga EXECUTE anon/PUBLIC em SECURITY DEFINER (exceto allowlist pública).
-- Data: 2026-09-18
-- Contexto: Postgres concede EXECUTE a PUBLIC por default. RPCs DEFINER de
-- financeiro/dashboard/staff ficam invocáveis com a anon key. Bob aplica esta
-- migration no remoto via Supabase MCP após review. Não recria handle_new_user.
--
-- Nomes abaixo vêm de GRANT/CREATE em supabase/migrations (grep), não de
-- assinaturas inventadas. O bloco dinâmico usa p.oid::regprocedure.

-- --------------------------------------------------------------------------
-- a) Default privileges: funções novas no schema public não herdam EXECUTE
--    para PUBLIC/anon. Só role atual (MCP/CLI) + postgres.
--    NÃO alterar default privileges de supabase_admin: o role do MCP
--    recebe permission denied.
-- --------------------------------------------------------------------------

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;

-- --------------------------------------------------------------------------
-- b) DEFINER existentes: REVOKE anon/PUBLIC, depois GRANT só na allowlist.
--    Allowlist = booking/fila/catálogo/clube públicos + slots + phones +
--    rate-limit de login + leitura de convite. NUNCA finance/dashboard/aios/
--    marketing/delete_*/mark_*_paid/purge_*/complete_staff_invite/
--    delete_staff_collaborator/release_staff_email_for_reinvite/
--    create_secure_booking (agenda autenticada).
-- --------------------------------------------------------------------------

DO $$
DECLARE
  r record;
  v_allowlist text[] := ARRAY[
    -- catálogo / perfil público (20260613_security_s2_public_rls.sql, 20260802000001)
    'get_public_profile_by_slug',
    'get_public_business_settings_json',
    'get_public_services_catalog',
    'get_public_categories_catalog',
    'get_public_team_catalog',
    'get_public_gallery_catalog',
    'get_public_products_catalog',
    'get_public_business_profile_minimal',
    -- booking público
    'get_public_booking_by_id',
    'get_booking_by_id',
    'get_active_booking_by_phone',
    'update_public_booking_by_client',
    'business_exists',
    'create_public_booking',
    'get_available_slots',
    'get_full_dates',
    'get_first_available_professional',
    -- sessão / Minha Área (OTP fica P0.7 — follow-up)
    'get_public_client_by_phone',
    'upsert_public_client',
    'get_client_bookings_history',
    -- fila pública (20260906000001_queue_v2.sql e follow-ups)
    'join_queue_entry',
    'get_queue_public_board',
    'get_queue_entry_public',
    'get_queue_position',
    'find_active_queue_entry_by_phone',
    'cancel_queue_entry_public',
    -- clube público (20260704000001, 20260905*)
    'get_public_membership_plans',
    'get_public_pix_config',
    'get_public_client_membership',
    'create_public_membership_request',
    'create_public_pix_payment',
    'cancel_public_client_membership',
    -- phones helpers (20260613, 20260602)
    'phones_match',
    'normalize_phone_digits',
    -- rate limit (20260214_rate_limiting.sql) — login chama como anon
    'check_login_rate_limit',
    'check_rate_limit',
    -- convite READ (20260802000007). get_company_for_invite: Register.tsx
    -- ainda chama; não há CREATE no repo — GRANT só se existir no banco.
    'get_team_member_for_invite',
    'get_company_for_invite'
  ];
BEGIN
  FOR r IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND NOT (p.proname = ANY (v_allowlist))
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon',
      r.oid::regprocedure
    );
  END LOOP;

  FOR r IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (v_allowlist)
  LOOP
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO anon, authenticated',
      r.oid::regprocedure
    );
  END LOOP;
END $$;
