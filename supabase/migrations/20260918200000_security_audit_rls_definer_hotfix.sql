-- Hotfix da auditoria de segurança (RLS + SECURITY DEFINER), set/2026.
--
-- Fecha os achados CRÍTICOS/ALTOS que são corrigíveis apenas no banco:
--   1. Signup público como "staff" de qualquer tenant (handle_new_user aceitava
--      company_id arbitrário do metadata sem convite pendente).
--   2. Tenant hopping / escalada via UPDATE direto em profiles.role/company_id.
--   3. mark_commissions_as_paid: DEFINER sem REVOKE (anon) e sem checagem de tenant.
--   4. RPCs financeiras/insights DEFINER que confiavam no p_user_id do cliente
--      (mark_expense_as_paid, get_monthly_finance_history, get_dashboard_actions,
--      get_aios_diagnostic, get_marketing_opportunities).
--   5. create_secure_booking: anon podia gravar appointments 'Confirmed' com
--      client_id/serviços/preço arbitrários em qualquer tenant.
--   6. RPCs internas criadas sem REVOKE FROM PUBLIC (executáveis por anon).
--
-- Padrão seguido: mesmo dos fixes anteriores (20260709000001) — wrapper que
-- resolve o tenant via COALESCE(get_auth_company_id(), auth.uid()) e delega
-- para a versão __tenant_unsafe, revogada de todos os roles de cliente.

-- ---------------------------------------------------------------------------
-- 1 + 2. profiles: trava role/company_id contra UPDATE direto do cliente.
--        Bypass explícito (set_config local à transação) só nas RPCs de convite.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profile_tenant_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND current_setting('app.allow_profile_tenant_change', true) IS DISTINCT FROM 'on'
     AND (
       NEW.role IS DISTINCT FROM OLD.role
       OR NEW.company_id IS DISTINCT FROM OLD.company_id
     ) THEN
    RAISE EXCEPTION 'profile_tenant_columns_locked'
      USING ERRCODE = 'insufficient_privilege',
            HINT = 'role/company_id só podem mudar via RPC de convite.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_profile_tenant_columns() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_guard_profile_tenant_columns ON public.profiles;
CREATE TRIGGER trg_guard_profile_tenant_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_tenant_columns();

-- complete_staff_invite: mesma lógica de 20260918000003 + bypass do guard.
CREATE OR REPLACE FUNCTION public.complete_staff_invite(
  p_company_id text,
  p_member_id uuid,
  p_birth_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_member public.team_members%ROWTYPE;
  v_owner_ok boolean;
  v_is_tenant_owner boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_company_id IS NULL OR btrim(p_company_id) = '' OR p_member_id IS NULL THEN
    RAISE EXCEPTION 'invalid_invite';
  END IF;

  IF v_uid::text = p_company_id THEN
    RAISE EXCEPTION 'owner_cannot_claim_staff_invite';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_uid::text
      AND COALESCE(role, 'owner') = 'owner'
      AND company_id = id
  ) INTO v_is_tenant_owner;

  IF v_is_tenant_owner THEN
    RAISE EXCEPTION 'owner_cannot_claim_staff_invite';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE staff_user_id = v_uid
      AND deleted_at IS NULL
      AND id IS DISTINCT FROM p_member_id
  ) THEN
    RAISE EXCEPTION 'invite_already_used';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_company_id
      AND COALESCE(role, 'owner') = 'owner'
  ) INTO v_owner_ok;

  IF NOT v_owner_ok THEN
    RAISE EXCEPTION 'invalid_invite';
  END IF;

  SELECT * INTO v_member
  FROM public.team_members
  WHERE id = p_member_id
    AND user_id::text = p_company_id
    AND COALESCE(is_owner, false) = false
    AND deleted_at IS NULL
    AND active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_invite';
  END IF;

  IF v_member.staff_user_id IS NOT NULL AND v_member.staff_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'invite_already_used';
  END IF;

  PERFORM set_config('app.allow_profile_tenant_change', 'on', true);

  UPDATE public.profiles
  SET
    role = 'staff',
    company_id = p_company_id,
    full_name = COALESCE(NULLIF(btrim(v_member.name), ''), full_name),
    business_name = COALESCE(business_name, ''),
    birth_date = COALESCE(p_birth_date, birth_date),
    tutorial_completed = false,
    updated_at = now()
  WHERE id = v_uid::text;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (
      id, role, company_id, full_name, birth_date, tutorial_completed
    ) VALUES (
      v_uid::text, 'staff', p_company_id, v_member.name, p_birth_date, false
    );
  END IF;

  UPDATE public.team_members
  SET
    staff_user_id = v_uid,
    updated_at = now()
  WHERE id = p_member_id
    AND user_id::text = p_company_id
    AND (staff_user_id IS NULL OR staff_user_id = v_uid);

  RETURN p_member_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_staff_invite(text, uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_staff_invite(text, uuid, date) TO authenticated;

-- handle_new_user: só nasce "staff" quando existe convite pendente na casa
-- indicada (e, se o metadata trouxer team_member_id, precisa ser exatamente ele).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role text;
  v_company_id text;
  v_member_id uuid;
  v_invite_ok boolean := false;
BEGIN
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'owner');
  IF v_role NOT IN ('owner', 'staff') THEN
    v_role := 'owner';
  END IF;
  v_company_id := COALESCE(NULLIF(btrim(new.raw_user_meta_data->>'company_id'), ''), new.id::text);
  IF v_role = 'staff' AND v_company_id = new.id::text THEN
    v_role := 'owner';
  END IF;

  IF v_role = 'staff' THEN
    BEGIN
      v_member_id := NULLIF(btrim(new.raw_user_meta_data->>'team_member_id'), '')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_member_id := NULL;
    END;

    SELECT EXISTS (
      SELECT 1
      FROM public.team_members tm
      JOIN public.profiles p ON p.id::text = tm.user_id::text
      WHERE tm.user_id::text = v_company_id
        AND COALESCE(p.role, 'owner') = 'owner'
        AND COALESCE(tm.is_owner, false) = false
        AND tm.deleted_at IS NULL
        AND tm.active = true
        AND tm.staff_user_id IS NULL
        AND (v_member_id IS NULL OR tm.id = v_member_id)
    ) INTO v_invite_ok;

    IF NOT v_invite_ok THEN
      v_role := 'owner';
      v_company_id := new.id::text;
    END IF;
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    business_name,
    phone,
    user_type,
    region,
    business_slug,
    role,
    company_id
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'business_name', ''),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'type', 'barber'),
    COALESCE(new.raw_user_meta_data->>'region', 'BR'),
    LOWER(REGEXP_REPLACE(COALESCE(new.raw_user_meta_data->>'business_name', 'business'), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(new.id::text, 1, 8),
    v_role,
    v_company_id
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    company_id = EXCLUDED.company_id,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    business_name = COALESCE(NULLIF(EXCLUDED.business_name, ''), public.profiles.business_name);

  IF v_role IS DISTINCT FROM 'staff' THEN
    INSERT INTO public.business_settings (user_id)
    VALUES (new.id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Trigger error: %', SQLERRM;
  RETURN new;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. mark_commissions_as_paid: tenant do JWT, nunca do parâmetro; sem anon.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_commissions_as_paid(
  p_user_id UUID,
  p_professional_id UUID,
  p_amount DECIMAL(10,2),
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_company_id TEXT;
BEGIN
  v_auth_company_id := COALESCE(get_auth_company_id(), auth.uid()::TEXT);

  IF v_auth_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_user_id::TEXT <> v_auth_company_id THEN
    RAISE EXCEPTION 'Acesso negado ao financeiro do tenant informado.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE id = p_professional_id
      AND user_id::TEXT = v_auth_company_id
  ) THEN
    RAISE EXCEPTION 'Profissional nao encontrado no tenant autenticado.';
  END IF;

  INSERT INTO finance_records (
    user_id,
    professional_id,
    barber_name,
    revenue,
    commission_value,
    type,
    description,
    created_at
  ) VALUES (
    p_user_id,
    p_professional_id,
    (SELECT name FROM team_members WHERE id = p_professional_id),
    0,
    p_amount,
    'expense',
    'Pagamento de Comissão',
    NOW()
  );

  UPDATE finance_records
  SET
    commission_paid = true,
    commission_paid_at = NOW()
  WHERE user_id = p_user_id
    AND professional_id = p_professional_id
    AND commission_paid = false
    AND created_at >= p_start_date
    AND created_at <= p_end_date;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_commissions_as_paid(UUID, UUID, DECIMAL, TIMESTAMP, TIMESTAMP) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_commissions_as_paid(UUID, UUID, DECIMAL, TIMESTAMP, TIMESTAMP) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. RPCs que confiavam no p_user_id do cliente.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_expense_as_paid(
  p_record_id TEXT,
  p_user_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_company_id TEXT;
BEGIN
  v_auth_company_id := COALESCE(get_auth_company_id(), auth.uid()::TEXT);

  IF v_auth_company_id IS NULL OR p_user_id IS DISTINCT FROM v_auth_company_id THEN
    RAISE EXCEPTION 'Acesso negado ao financeiro do tenant informado.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE finance_records
  SET
    commission_paid    = TRUE,
    commission_paid_at = NOW(),
    status             = 'paid'
  WHERE id        = p_record_id::UUID
    AND user_id   = v_auth_company_id
    AND type      = 'expense';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro não encontrado ou sem permissão: %', p_record_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_expense_as_paid(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_expense_as_paid(TEXT, TEXT) TO authenticated;

-- get_monthly_finance_history → wrapper + __tenant_unsafe
DO $$
BEGIN
  IF to_regprocedure('public.get_monthly_finance_history(text, integer)') IS NOT NULL
     AND to_regprocedure('public.get_monthly_finance_history__tenant_unsafe(text, integer)') IS NULL THEN
    ALTER FUNCTION public.get_monthly_finance_history(text, integer)
      RENAME TO get_monthly_finance_history__tenant_unsafe;
  END IF;
  IF to_regprocedure('public.get_monthly_finance_history__tenant_unsafe(text, integer)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.get_monthly_finance_history__tenant_unsafe(text, integer) FROM PUBLIC, anon, authenticated;
    ALTER FUNCTION public.get_monthly_finance_history__tenant_unsafe(text, integer) SET search_path = public;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_monthly_finance_history(
  p_user_id TEXT,
  p_months_count INTEGER DEFAULT 12
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_company_id TEXT;
BEGIN
  v_auth_company_id := COALESCE(get_auth_company_id(), auth.uid()::TEXT);
  IF v_auth_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.get_monthly_finance_history__tenant_unsafe(v_auth_company_id, p_months_count);
END;
$$;

REVOKE ALL ON FUNCTION public.get_monthly_finance_history(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_monthly_finance_history(text, integer) TO authenticated;

-- get_dashboard_actions → wrapper + __tenant_unsafe
DO $$
BEGIN
  IF to_regprocedure('public.get_dashboard_actions(uuid)') IS NOT NULL
     AND to_regprocedure('public.get_dashboard_actions__tenant_unsafe(uuid)') IS NULL THEN
    ALTER FUNCTION public.get_dashboard_actions(uuid)
      RENAME TO get_dashboard_actions__tenant_unsafe;
  END IF;
  IF to_regprocedure('public.get_dashboard_actions__tenant_unsafe(uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.get_dashboard_actions__tenant_unsafe(uuid) FROM PUBLIC, anon, authenticated;
    ALTER FUNCTION public.get_dashboard_actions__tenant_unsafe(uuid) SET search_path = public;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_dashboard_actions(p_user_id UUID)
RETURNS TABLE (
  id          TEXT,
  title       TEXT,
  description TEXT,
  priority    TEXT,
  action_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_company_id TEXT;
BEGIN
  v_auth_company_id := COALESCE(get_auth_company_id(), auth.uid()::TEXT);
  IF v_auth_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
  SELECT * FROM public.get_dashboard_actions__tenant_unsafe(v_auth_company_id::uuid);
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_actions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_actions(uuid) TO authenticated;

-- get_aios_diagnostic → wrapper + __tenant_unsafe
DO $$
BEGIN
  IF to_regprocedure('public.get_aios_diagnostic(uuid)') IS NOT NULL
     AND to_regprocedure('public.get_aios_diagnostic__tenant_unsafe(uuid)') IS NULL THEN
    ALTER FUNCTION public.get_aios_diagnostic(uuid)
      RENAME TO get_aios_diagnostic__tenant_unsafe;
  END IF;
  IF to_regprocedure('public.get_aios_diagnostic__tenant_unsafe(uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.get_aios_diagnostic__tenant_unsafe(uuid) FROM PUBLIC, anon, authenticated;
    ALTER FUNCTION public.get_aios_diagnostic__tenant_unsafe(uuid) SET search_path = public;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_aios_diagnostic(p_establishment_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_company_id TEXT;
BEGIN
  v_auth_company_id := COALESCE(get_auth_company_id(), auth.uid()::TEXT);
  IF v_auth_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.get_aios_diagnostic__tenant_unsafe(v_auth_company_id::uuid);
END;
$$;

REVOKE ALL ON FUNCTION public.get_aios_diagnostic(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_aios_diagnostic(uuid) TO authenticated;

-- get_marketing_opportunities → wrapper + __tenant_unsafe
DO $$
BEGIN
  IF to_regprocedure('public.get_marketing_opportunities(uuid)') IS NOT NULL
     AND to_regprocedure('public.get_marketing_opportunities__tenant_unsafe(uuid)') IS NULL THEN
    ALTER FUNCTION public.get_marketing_opportunities(uuid)
      RENAME TO get_marketing_opportunities__tenant_unsafe;
  END IF;
  IF to_regprocedure('public.get_marketing_opportunities__tenant_unsafe(uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.get_marketing_opportunities__tenant_unsafe(uuid) FROM PUBLIC, anon, authenticated;
    ALTER FUNCTION public.get_marketing_opportunities__tenant_unsafe(uuid) SET search_path = public;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_marketing_opportunities(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_company_id TEXT;
BEGIN
  v_auth_company_id := COALESCE(get_auth_company_id(), auth.uid()::TEXT);
  IF v_auth_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.get_marketing_opportunities__tenant_unsafe(v_auth_company_id::uuid);
END;
$$;

REVOKE ALL ON FUNCTION public.get_marketing_opportunities(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_marketing_opportunities(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. create_secure_booking: anon só cria public_bookings 'pending'; gravar
--    appointments 'Confirmed' e vincular client_id exige o dono/staff do tenant.
--    Serviços informados precisam pertencer ao tenant.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_secure_booking(
    p_business_id UUID,
    p_professional_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_email TEXT,
    p_appointment_time TIMESTAMPTZ,
    p_service_ids TEXT[],
    p_total_price NUMERIC,
    p_duration_min INTEGER DEFAULT 30,
    p_status TEXT DEFAULT 'pending',
    p_client_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_custom_service_name TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_busy BOOLEAN;
    v_booking_id UUID;
    v_service_names TEXT;
    v_caller_tenant TEXT;
    v_is_tenant_user BOOLEAN;
    v_status TEXT;
    v_client_id UUID;
BEGIN
    v_caller_tenant := COALESCE(get_auth_company_id(), auth.uid()::TEXT);
    v_is_tenant_user := (v_caller_tenant IS NOT NULL AND v_caller_tenant = p_business_id::TEXT);

    IF v_is_tenant_user THEN
        v_status := COALESCE(p_status, 'pending');
        v_client_id := p_client_id;
    ELSE
        v_status := 'pending';
        v_client_id := NULL;
    END IF;

    IF v_client_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id = v_client_id
          AND c.user_id::TEXT = p_business_id::TEXT
    ) THEN
        RAISE EXCEPTION 'Cliente nao pertence ao estabelecimento.';
    END IF;

    IF p_professional_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.id = p_professional_id
          AND tm.user_id::TEXT = p_business_id::TEXT
    ) THEN
        RAISE EXCEPTION 'Profissional nao pertence ao estabelecimento.';
    END IF;

    IF p_service_ids IS NOT NULL AND array_length(p_service_ids, 1) > 0 AND EXISTS (
        SELECT 1 FROM unnest(p_service_ids::uuid[]) AS sid
        WHERE NOT EXISTS (
            SELECT 1 FROM public.services s
            WHERE s.id = sid
              AND s.user_id::TEXT = p_business_id::TEXT
        )
    ) THEN
        RAISE EXCEPTION 'Servico nao pertence ao estabelecimento.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.user_id = p_business_id::text
          AND a.professional_id = p_professional_id
          AND a.status != 'Cancelled'
          AND a.appointment_time < p_appointment_time + (p_duration_min || ' minutes')::INTERVAL
          AND (a.appointment_time + INTERVAL '1 minute') > p_appointment_time

        UNION ALL

        SELECT 1 FROM public.public_bookings pb
        WHERE pb.business_id = p_business_id::text
          AND pb.professional_id = p_professional_id
          AND pb.status IN ('pending', 'confirmed')
          AND pb.appointment_time < p_appointment_time + (p_duration_min || ' minutes')::INTERVAL
          AND (pb.appointment_time + (p_duration_min || ' minutes')::INTERVAL) > p_appointment_time
    ) INTO v_is_busy;

    IF v_is_busy THEN
        RETURN json_build_object('success', false, 'message', 'Desculpe, este horário acabou de ser ocupado. Por favor, escolha outro.');
    END IF;

    SELECT string_agg(name, ', ') INTO v_service_names
    FROM public.services
    WHERE id = ANY(p_service_ids::uuid[])
      AND user_id::TEXT = p_business_id::TEXT;

    IF p_custom_service_name IS NOT NULL AND p_custom_service_name != '' THEN
        IF v_service_names IS NOT NULL AND v_service_names != '' THEN
            v_service_names := v_service_names || ' + ' || p_custom_service_name;
        ELSE
            v_service_names := p_custom_service_name;
        END IF;
    END IF;

    IF v_is_tenant_user AND v_status = 'Confirmed' AND v_client_id IS NOT NULL THEN
        INSERT INTO public.appointments (
            user_id,
            client_id,
            professional_id,
            service,
            appointment_time,
            price,
            duration_minutes,
            status,
            notes,
            payment_method
        ) VALUES (
            p_business_id::text,
            v_client_id,
            p_professional_id,
            v_service_names,
            p_appointment_time,
            p_total_price,
            p_duration_min,
            'Confirmed',
            p_notes,
            p_payment_method
        ) RETURNING id INTO v_booking_id;
    ELSE
        INSERT INTO public.public_bookings (
            business_id,
            professional_id,
            customer_name,
            customer_phone,
            customer_email,
            appointment_time,
            service_ids,
            total_price,
            duration_minutes,
            status,
            notes,
            payment_method
        ) VALUES (
            p_business_id::text,
            p_professional_id,
            p_customer_name,
            p_customer_phone,
            p_customer_email,
            p_appointment_time,
            p_service_ids::uuid[],
            p_total_price,
            p_duration_min,
            v_status,
            CASE
                WHEN p_custom_service_name IS NOT NULL AND p_custom_service_name != '' THEN
                    COALESCE(p_notes, '') || E'\nServiço Personalizado: ' || p_custom_service_name
                ELSE p_notes
            END,
            p_payment_method
        ) RETURNING id INTO v_booking_id;
    END IF;

    RETURN json_build_object('success', true, 'booking_id', v_booking_id);
END;
$$;

REVOKE ALL ON FUNCTION public.create_secure_booking(UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT[], NUMERIC, INTEGER, TEXT, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_secure_booking(UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT[], NUMERIC, INTEGER, TEXT, UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. RPCs internas/legadas criadas sem REVOKE FROM PUBLIC.
--    (idempotente: só toca no que existir no banco alvo)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_sig TEXT;
  v_internal TEXT[] := ARRAY[
    'public.cleanup_old_audit_logs()',
    'public.cleanup_rate_limits()',
    'public.cleanup_old_deleted_items()',
    'public.get_booking_by_token(uuid, uuid)',
    'public.check_rate_limit(text, integer, integer)'
  ];
  v_authenticated_only TEXT[] := ARRAY[
    'public.restore_appointment(uuid)',
    'public.restore_client(uuid)',
    'public.restore_financial_record(uuid)',
    'public.restore_service(uuid)',
    'public.restore_team_member(uuid)',
    'public.soft_delete_financial_record(uuid)',
    'public.soft_delete_service(uuid)',
    'public.soft_delete_team_member(uuid)',
    'public.soft_delete_appointment(uuid)',
    'public.soft_delete_client(uuid)',
    'public.get_deleted_items(varchar, integer)',
    'public.get_audit_logs(integer, integer, varchar, varchar, timestamptz, timestamptz)',
    'public.create_audit_log(varchar, varchar, uuid, jsonb, jsonb, jsonb)',
    'public.log_aios_campaign(uuid, text, text, jsonb)'
  ];
BEGIN
  FOREACH v_sig IN ARRAY v_internal LOOP
    IF to_regprocedure(v_sig) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_sig);
    END IF;
  END LOOP;

  FOREACH v_sig IN ARRAY v_authenticated_only LOOP
    IF to_regprocedure(v_sig) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', v_sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_sig);
    END IF;
  END LOOP;
END $$;

-- search_path fixo nas DEFINER legadas que ainda não tinham.
DO $$
DECLARE
  v_sig TEXT;
  v_defs TEXT[] := ARRAY[
    'public.find_client_by_phone_normalized(text, uuid)',
    'public.get_booking_by_token(uuid, uuid)',
    'public.is_staff_of(uuid)',
    'public.create_audit_log(varchar, varchar, uuid, jsonb, jsonb, jsonb)',
    'public.trigger_audit_log()',
    'public.get_audit_logs(integer, integer, varchar, varchar, timestamptz, timestamptz)',
    'public.cleanup_old_audit_logs()',
    'public.check_rate_limit(text, integer, integer)',
    'public.check_login_rate_limit(text)',
    'public.cleanup_rate_limits()',
    'public.soft_delete_financial_record(uuid)',
    'public.soft_delete_service(uuid)',
    'public.soft_delete_team_member(uuid)',
    'public.restore_appointment(uuid)',
    'public.restore_client(uuid)',
    'public.restore_financial_record(uuid)',
    'public.restore_service(uuid)',
    'public.restore_team_member(uuid)',
    'public.get_deleted_items(varchar, integer)',
    'public.cleanup_old_deleted_items()',
    'public.log_error(text, text, text, varchar, jsonb)',
    'public.check_email_confirmed()',
    'public.get_queue_position(uuid, uuid)',
    'public.log_aios_campaign(uuid, text, text, jsonb)',
    'public.get_client_bookings_history(text, uuid)',
    'public.upsert_onboarding_progress(text, smallint, smallint[], jsonb)',
    'public.get_team_member_for_invite(text, uuid)',
    'public.get_client_profile(uuid)'
  ];
BEGIN
  FOREACH v_sig IN ARRAY v_defs LOOP
    IF to_regprocedure(v_sig) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public', v_sig);
    END IF;
  END LOOP;
END $$;
