-- Verificação pós-aplicação de 20260929120000_staff_invite_hardening.sql.
-- Somente leitura: roda dentro de BEGIN READ ONLY ... ROLLBACK (qualquer escrita
-- falharia e nada é gravado). Aborta com erro se algo divergir.
-- Esperado: NOTICE "staff_invite verify: OK ..." e nenhuma exceção.
BEGIN READ ONLY;

DO $verify$
DECLARE
  r record;
  v_bad text := '';
  v_pending int;
  v_invites int;
BEGIN
  -- md5(pg_get_functiondef) das definições desta migration e ACL (sem PUBLIC)
  FOR r IN
    SELECT e.sig, e.md5 AS want, md5(pg_get_functiondef(to_regprocedure(e.sig))) AS got,
           (SELECT string_agg(a.grantee::regrole::text, ',' ORDER BY a.grantee::regrole::text)
              FROM aclexplode((SELECT proacl FROM pg_proc WHERE oid = to_regprocedure(e.sig))) a
             WHERE a.privilege_type = 'EXECUTE' AND a.grantee <> 0) AS acl_got,
           EXISTS (SELECT 1 FROM aclexplode((SELECT proacl FROM pg_proc WHERE oid = to_regprocedure(e.sig))) a
                    WHERE a.grantee = 0) AS has_public,
           e.acl AS acl_want
    FROM (VALUES
      ('public.complete_staff_invite(text,uuid,date,text)', '603dbe6d69117586c22e5a98edfc9793', 'authenticated,postgres,service_role'),
      ('public.get_team_member_for_invite(text,uuid,text)', '459cfabd32e82ad70473f9b812ff7178', 'anon,authenticated,postgres,service_role'),
      ('public.release_staff_email_for_reinvite(text,uuid,text,text)', '02827f53a3104124003f249b47086365', 'authenticated,postgres,service_role'),
      ('public.handle_new_user()', 'c8a7b72f628759face7d157f09e1c3e5', 'authenticated,postgres,service_role'),
      ('public.relink_staff_if_unbound()', 'ed50273d621db87218d84fdd54352ad4', 'authenticated,postgres,service_role'),
      ('public.get_or_create_staff_invite(uuid)', '71ada961b3a99fbc03895318e84e9349', 'authenticated,postgres,service_role'),
      ('public.rotate_staff_invite(uuid)', '97908e8f193a35dafb08b8333bc5f33d', 'authenticated,postgres,service_role'),
      ('public.staff_invite_token_is_valid(uuid,text,text)', 'e95c61f275c502f861c817b31d46326d', 'postgres,service_role'),
      ('public.accept_staff_invite(text,uuid)', '1d4a305c3109970f0e004e26fa8ad025', 'postgres,service_role')
    ) AS e(sig, md5, acl)
  LOOP
    IF r.got IS DISTINCT FROM r.want THEN
      v_bad := v_bad || format(' %s md5=%s (esperado %s);', r.sig, COALESCE(r.got, 'ausente'), r.want);
    END IF;
    IF r.acl_got IS DISTINCT FROM r.acl_want OR r.has_public THEN
      v_bad := v_bad || format(' %s acl=%s public=%s (esperado %s);', r.sig, r.acl_got, r.has_public, r.acl_want);
    END IF;
  END LOOP;

  -- Uma única versão de cada função com assinatura nova
  IF (SELECT count(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace
      AND proname IN ('complete_staff_invite', 'get_team_member_for_invite', 'release_staff_email_for_reinvite')) <> 3 THEN
    v_bad := v_bad || ' há mais de uma versão de complete/get_team_member/release;';
  END IF;

  -- staff_invites: RLS ligada, sem policies e sem grants para anon/authenticated
  IF to_regclass('public.staff_invites') IS NULL THEN
    v_bad := v_bad || ' staff_invites ausente;';
  ELSE
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.staff_invites'::regclass) THEN
      v_bad := v_bad || ' staff_invites sem RLS;';
    END IF;
    IF has_table_privilege('anon', 'public.staff_invites', 'SELECT,INSERT,UPDATE,DELETE')
       OR has_table_privilege('authenticated', 'public.staff_invites', 'SELECT,INSERT,UPDATE,DELETE') THEN
      v_bad := v_bad || ' staff_invites com grant para anon/authenticated;';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff_invites') THEN
      v_bad := v_bad || ' staff_invites com policy;';
    END IF;
    SELECT count(*) INTO v_invites FROM public.staff_invites;
  END IF;

  IF v_bad <> '' THEN
    RAISE EXCEPTION 'staff_invite verify: FALHOU:%', v_bad;
  END IF;

  SELECT count(*) INTO v_pending FROM public.team_members
  WHERE staff_user_id IS NULL AND deleted_at IS NULL AND active = true AND COALESCE(is_owner, false) = false;
  RAISE NOTICE 'staff_invite verify: OK (9 funções com md5/ACL esperados, staff_invites fechada; convites emitidos=%, cadastros ativos sem login aguardando novo link=%)', v_invites, v_pending;
END
$verify$;

ROLLBACK;
