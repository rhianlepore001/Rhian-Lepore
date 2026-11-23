\ir staff_invite.harness.sql
\ir ../migrations/20261116120000_staff_invite_hardening.sql

CREATE TEMP TABLE baseline_membership_helpers AS
SELECT oid, pg_get_functiondef(oid) definition, proacl::text acl
FROM pg_proc WHERE oid IN ('public.get_auth_company_id()'::regprocedure, 'public.get_auth_role()'::regprocedure);

CREATE TEMP TABLE baseline_bound_access AS
SELECT p.id, public._fingerprint('authenticated', p.id) AS access
FROM public.profiles p
WHERE p.id IN (
  '00000000-0000-0000-0000-0000000000a0', '00000000-0000-0000-0000-0000000000b0',
  '00000000-0000-0000-0000-0000000000c0', '00000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-0000000000a2'
);

\ir ../migrations/20261120132959_require_live_staff_membership.sql

DO $$
BEGIN
  IF EXISTS (SELECT FROM baseline_bound_access b WHERE b.access IS DISTINCT FROM public._fingerprint('authenticated', b.id)) THEN
    RAISE EXCEPTION 'Dono, colaborador vinculado ou recepção perdeu acesso';
  END IF;

  IF EXISTS (
    SELECT FROM unnest(ARRAY[
      '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a4',
      '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a6',
      '00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000a8'
    ]) AS staff(id)
    WHERE public._fingerprint('authenticated', staff.id) IS DISTINCT FROM
      'company=NULL appt=0 cli=0 svc=0 tm=0 fin=0 pb=0 prof=1'
  ) THEN
    RAISE EXCEPTION 'Perfil sem vínculo válido recebeu dados internos';
  END IF;

  IF public._fingerprint('anon', NULL) IS DISTINCT FROM 'company=NULL appt=0 cli=0 svc=0 tm=0 fin=0 pb=0 prof=0' THEN
    RAISE EXCEPTION 'Visitante anônimo recebeu dados internos';
  END IF;
END;
$$;

\ir staff_invite.test.sql

DO $$
DECLARE
  v_reception text := '00000000-0000-0000-0000-0000000000a2';
  v_reception_row uuid := '10000000-0000-0000-0000-0000000000a2';
  v_expected text := public._fingerprint('authenticated', v_reception);
BEGIN
  IF pg_temp.q('authenticated', '30000000-0000-0000-0000-0000000000ee',
      'SELECT public.get_auth_company_id()') IS DISTINCT FROM 'ok:30000000-0000-0000-0000-0000000000ee' THEN
    RAISE EXCEPTION 'Dono novo não obteve a própria empresa após o cadastro';
  END IF;

  IF pg_temp.q('authenticated', v_reception, 'SELECT public.relink_staff_if_unbound()::text')
      IS DISTINCT FROM ('ok:' || v_reception_row::text) THEN
    RAISE EXCEPTION 'Colaborador fora da agenda perdeu o vínculo existente';
  END IF;

  IF pg_temp.q('authenticated', '00000000-0000-0000-0000-0000000000a1',
      $query$SELECT count(*)::text FROM public.appointments WHERE user_id = '00000000-0000-0000-0000-0000000000b0'$query$)
      IS DISTINCT FROM 'ok:0' THEN
    RAISE EXCEPTION 'Vínculo da empresa A permite ler a empresa B';
  END IF;

  UPDATE public.team_members SET active = true WHERE id = v_reception_row;
  IF public._fingerprint('authenticated', v_reception) IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'Reexibir o profissional na agenda alterou o alcance de leitura';
  END IF;
  UPDATE public.team_members SET deleted_at = now() WHERE id = v_reception_row;
  IF public._fingerprint('authenticated', v_reception)
      IS DISTINCT FROM 'company=NULL appt=0 cli=0 svc=0 tm=0 fin=0 pb=0 prof=1' THEN
    RAISE EXCEPTION 'Sessão existente manteve acesso após a remoção do vínculo';
  END IF;

  UPDATE public.team_members SET deleted_at = NULL WHERE id = v_reception_row;
  IF public._fingerprint('authenticated', v_reception) IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'Restauração administrativa de um vínculo válido perdeu acesso';
  END IF;
END;
$$;

\ir ../../docs/rollbacks/20261120132959_require_live_staff_membership.rollback.sql

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM baseline_membership_helpers b JOIN pg_proc p ON p.oid = b.oid
    WHERE pg_get_functiondef(p.oid) IS DISTINCT FROM b.definition OR p.proacl::text IS DISTINCT FROM b.acl
  ) OR EXISTS (SELECT FROM pg_policy WHERE polname IN ('require_bound_staff', 'require_bound_staff_to_read_peer_profiles')) THEN
    RAISE EXCEPTION 'Rollback divergiu das definições ou privilégios originais';
  END IF;
END;
$$;
