-- P0: fecha IDOR autenticado em RPCs SECURITY DEFINER de financeiro/dashboard
--      e endurece create_secure_booking (agenda autenticada).
-- Data: 2026-09-18
--
-- Contexto: #80 revogou EXECUTE de anon, mas callers authenticated ainda
-- passam p_user_id / p_business_id de outro tenant. Núcleo útil do PR #79
-- (fechado), sem identity lock / handle_new_user / release_staff_email.
--
-- Padrão (igual 20260709000001): corpo vira <nome>__tenant_unsafe (REVOKE
-- anon+authenticated) + wrapper com a mesma assinatura que deriva o tenant
-- de COALESCE(get_auth_company_id(), auth.uid()) e ignora o id do cliente.
-- Idempotente se 20260709000001 já tiver rodado.
--
-- create_secure_booking: rewrite in-place. Caller fora do tenant NÃO grava
-- Confirmed / client_id / preço em outro business. Anon continua sem
-- EXECUTE (não reabrir grant). Booking público segue em public_bookings
-- INSERT pending e/ou create_public_booking — esta migration não os toca.

DROP FUNCTION IF EXISTS public.__agendix_install_tenant_wrapper(text, text);

-- ---------------------------------------------------------------------------
-- Helper: instala wrapper tenant-safe para um nome (todas as overloads, ou
-- uma assinatura se p_ident for informado). Dropado no final.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.__agendix_install_tenant_wrapper(
  p_func_name text,
  p_ident text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $install$
DECLARE
  r record;
  v_unsafe text;
  v_tenant_idx int;
  v_i int;
  v_call text;
  v_argtype text;
  v_body text;
  v_stmt text;
  v_names text[];
  v_type_names text[];
BEGIN
  v_unsafe := p_func_name || '__tenant_unsafe';

  FOR r IN
    SELECT
      p.oid,
      p.proname,
      p.proargnames,
      p.proargtypes::oid[] AS argtypes,
      p.prorettype,
      p.proretset,
      pg_get_function_identity_arguments(p.oid) AS ident,
      oidvectortypes(p.proargtypes) AS type_list,
      pg_get_function_arguments(p.oid) AS args_full,
      pg_get_function_result(p.oid) AS result,
      (SELECT array_agg(format_type(t, NULL) ORDER BY ord)
         FROM unnest(p.proargtypes::oid[]) WITH ORDINALITY AS u(t, ord)
      ) AS argtype_names
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = p_func_name
      AND (
        p_ident IS NULL
        OR pg_get_function_identity_arguments(p.oid) = p_ident
        OR oidvectortypes(p.proargtypes) = p_ident
      )
    ORDER BY p.oid
  LOOP
    -- to_regprocedure / ALTER/REVOKE exigem tipos SEM nomes de parâmetro.
    IF to_regprocedure(format('public.%I(%s)', v_unsafe, r.type_list)) IS NULL THEN
      EXECUTE format(
        'ALTER FUNCTION public.%I(%s) RENAME TO %I',
        p_func_name, r.type_list, v_unsafe
      );
    END IF;

    v_names := r.proargnames;
    v_type_names := r.argtype_names;
    v_tenant_idx := NULL;

    IF v_names IS NOT NULL THEN
      FOR v_i IN 1..array_length(v_names, 1) LOOP
        IF v_names[v_i] IN ('p_user_id', 'p_establishment_id', 'p_business_id') THEN
          v_tenant_idx := v_i;
          EXIT;
        END IF;
      END LOOP;
    END IF;

    IF v_tenant_idx IS NULL THEN
      v_tenant_idx := 1;
    END IF;

    v_call := '';
    IF v_names IS NULL OR array_length(v_names, 1) IS NULL THEN
      RAISE EXCEPTION 'RPC % (%) sem nomes de argumento; nao e possivel wrappar',
        p_func_name, r.ident;
    END IF;

    FOR v_i IN 1..array_length(v_names, 1) LOOP
      IF v_i > 1 THEN
        v_call := v_call || ', ';
      END IF;
      IF v_i = v_tenant_idx THEN
        v_argtype := v_type_names[v_i];
        v_call := v_call || format('v_auth_company_id::%s', v_argtype);
      ELSE
        v_call := v_call || format('%I', v_names[v_i]);
      END IF;
    END LOOP;

    IF r.prorettype = 'void'::regtype THEN
      v_body := format('PERFORM public.%I(%s);', v_unsafe, v_call);
    ELSIF r.proretset THEN
      v_body := format(
        'RETURN QUERY SELECT * FROM public.%I(%s);',
        v_unsafe, v_call
      );
    ELSE
      v_body := format('RETURN public.%I(%s);', v_unsafe, v_call);
    END IF;

    v_stmt := format(
      $fn$
CREATE OR REPLACE FUNCTION public.%I(%s)
RETURNS %s
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
  v_auth_company_id TEXT;
BEGIN
  v_auth_company_id := COALESCE(get_auth_company_id()::TEXT, auth.uid()::TEXT);
  IF v_auth_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  %s
END;
$body$;
$fn$,
      p_func_name,
      r.args_full,
      r.result,
      v_body
    );

    EXECUTE v_stmt;

    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET search_path = public',
      v_unsafe, r.type_list
    );
    EXECUTE format(
      'REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
      v_unsafe, r.type_list
    );
    EXECUTE format(
      'REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
      p_func_name, r.type_list
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated',
      p_func_name, r.type_list
    );
    EXECUTE format(
      'COMMENT ON FUNCTION public.%I(%s) IS %L',
      p_func_name,
      r.type_list,
      'P0 tenant guard: p_user_id/p_business_id do cliente e ignorado; tenant vem de auth.uid()/get_auth_company_id().'
    );
  END LOOP;
END;
$install$;

REVOKE ALL ON FUNCTION public.__agendix_install_tenant_wrapper(text, text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Leituras/escritas financeiras e dashboard que confiavam no id do cliente
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  PERFORM public.__agendix_install_tenant_wrapper('mark_expense_as_paid');
  PERFORM public.__agendix_install_tenant_wrapper('get_monthly_finance_history');
  PERFORM public.__agendix_install_tenant_wrapper('get_dashboard_actions');
  PERFORM public.__agendix_install_tenant_wrapper('get_aios_diagnostic');
  PERFORM public.__agendix_install_tenant_wrapper('get_marketing_opportunities');
  PERFORM public.__agendix_install_tenant_wrapper('get_professional_finance_summary');
  PERFORM public.__agendix_install_tenant_wrapper('get_dashboard_stats');
  PERFORM public.__agendix_install_tenant_wrapper('get_client_insights');
  PERFORM public.__agendix_install_tenant_wrapper('get_professional_commission_details');
  PERFORM public.__agendix_install_tenant_wrapper('get_dashboard_insights');
  PERFORM public.__agendix_install_tenant_wrapper('mark_commissions_as_paid');
  -- 4-arg: wrapper ignora p_user_id. 3-arg sem guarda vira delegacao abaixo.
  PERFORM public.__agendix_install_tenant_wrapper(
    'get_finance_stats',
    'text, text, text, uuid'
  );
END $$;

DO $$
BEGIN
  IF to_regprocedure(
       'public.get_finance_stats(text, text, text, uuid)'
     ) IS NULL THEN
    PERFORM public.__agendix_install_tenant_wrapper(
      'get_finance_stats',
      'text, text, text'
    );
  ELSIF to_regprocedure(
          'public.get_finance_stats(text, text, text)'
        ) IS NOT NULL THEN
    EXECUTE $fn$
CREATE OR REPLACE FUNCTION public.get_finance_stats(
  p_user_id text,
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
  v_auth_company_id TEXT;
BEGIN
  v_auth_company_id := COALESCE(get_auth_company_id()::TEXT, auth.uid()::TEXT);
  IF v_auth_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.get_finance_stats(
    v_auth_company_id,
    p_start_date,
    p_end_date,
    NULL::uuid
  );
END;
$body$;
$fn$;
    REVOKE ALL ON FUNCTION public.get_finance_stats(text, text, text) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.get_finance_stats(text, text, text) TO authenticated;
    COMMENT ON FUNCTION public.get_finance_stats(text, text, text) IS
      'P0 tenant guard: overload sem p_professional_id delega para a versao com guarda; p_user_id do cliente e ignorado.';
  END IF;
END $$;

DROP FUNCTION public.__agendix_install_tenant_wrapper(text, text);

-- ---------------------------------------------------------------------------
-- 2. create_secure_booking — so o tenant autenticado grava Confirmed/preço.
--    Overload UUID (Agenda) + TEXT legado (delega). Sem GRANT anon.
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
    v_status TEXT;
    v_client_id UUID;
BEGIN
    v_caller_tenant := COALESCE(get_auth_company_id()::TEXT, auth.uid()::TEXT);

    IF v_caller_tenant IS NULL OR v_caller_tenant IS DISTINCT FROM p_business_id::TEXT THEN
        RAISE EXCEPTION 'Acesso negado ao estabelecimento informado.'
          USING ERRCODE = 'insufficient_privilege';
    END IF;

    v_status := COALESCE(p_status, 'pending');
    v_client_id := p_client_id;

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
        SELECT 1
        FROM unnest(p_service_ids::uuid[]) AS sid
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
        RETURN json_build_object(
          'success', false,
          'message', 'Desculpe, este horário acabou de ser ocupado. Por favor, escolha outro.'
        );
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

    IF v_status = 'Confirmed' AND v_client_id IS NOT NULL THEN
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

REVOKE ALL ON FUNCTION public.create_secure_booking(
  UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT[], NUMERIC, INTEGER, TEXT, UUID, TEXT, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_secure_booking(
  UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT[], NUMERIC, INTEGER, TEXT, UUID, TEXT, TEXT, TEXT
) TO authenticated;

COMMENT ON FUNCTION public.create_secure_booking(
  UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT[], NUMERIC, INTEGER, TEXT, UUID, TEXT, TEXT, TEXT
) IS
  'P0: so o tenant autenticado cria Confirmed/client_id/preco. Anon sem EXECUTE; publico usa create_public_booking / INSERT pending.';

DO $$
BEGIN
  IF to_regprocedure(
       'public.create_secure_booking(text, text, text, text, text, timestamptz, text[], numeric, integer, text, text, text, text)'
     ) IS NULL THEN
    RETURN;
  END IF;

  EXECUTE $fn$
CREATE OR REPLACE FUNCTION public.create_secure_booking(
    p_business_id TEXT,
    p_professional_id TEXT,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_email TEXT,
    p_appointment_time TIMESTAMPTZ,
    p_service_ids TEXT[],
    p_total_price NUMERIC,
    p_duration_min INTEGER DEFAULT 30,
    p_status TEXT DEFAULT 'pending',
    p_client_id TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_custom_service_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
    v_business uuid;
    v_professional uuid;
    v_client uuid;
BEGIN
    BEGIN
        v_business := p_business_id::uuid;
        v_professional := NULLIF(btrim(p_professional_id), '')::uuid;
        IF p_client_id IS NOT NULL AND btrim(p_client_id) <> '' THEN
            v_client := p_client_id::uuid;
        END IF;
    EXCEPTION WHEN invalid_text_representation THEN
        RETURN json_build_object(
          'success', false,
          'message', 'Formato de ID inválido. Por favor, tente novamente.'
        );
    END;

    RETURN public.create_secure_booking(
        v_business,
        v_professional,
        p_customer_name,
        p_customer_phone,
        p_customer_email,
        p_appointment_time,
        p_service_ids,
        p_total_price,
        p_duration_min,
        p_status,
        v_client,
        p_notes,
        p_custom_service_name,
        NULL::text
    );
END;
$body$;
$fn$;

  REVOKE ALL ON FUNCTION public.create_secure_booking(
    TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT[], NUMERIC, INTEGER, TEXT, TEXT, TEXT, TEXT
  ) FROM PUBLIC, anon;
  GRANT EXECUTE ON FUNCTION public.create_secure_booking(
    TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT[], NUMERIC, INTEGER, TEXT, TEXT, TEXT, TEXT
  ) TO authenticated;
END $$;
