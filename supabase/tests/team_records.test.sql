CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
CREATE FUNCTION public.get_auth_company_id() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.company_id', true), '')
$$;
CREATE FUNCTION public.get_auth_role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.app_role', true), '')
$$;

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  business_id uuid,
  staff_user_id uuid,
  name text NOT NULL,
  photo_url text,
  active boolean DEFAULT true,
  deleted_at timestamptz,
  commission_rate numeric,
  cpf text
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO anon, authenticated;
CREATE POLICY "Team: company isolation" ON public.team_members FOR ALL TO authenticated
  USING (user_id = get_auth_company_id()) WITH CHECK (user_id = get_auth_company_id());
CREATE POLICY legacy_public_read ON public.team_members FOR SELECT USING (active);
CREATE FUNCTION public.is_staff_of(p_business_id uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT FROM public.team_members t
    WHERE t.user_id = auth.uid()::text AND t.business_id = p_business_id AND t.active
  )
$$;

INSERT INTO public.team_members (user_id, staff_user_id, name, commission_rate, cpf, active) VALUES
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Colaboradora A', 20, 'CPF fictício A', true),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Colega A', 35, 'CPF fictício colega A', true),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'Inativo A', 40, 'CPF fictício inativo A', false),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', 'Colaborador B', 45, 'CPF fictício B', true);

\ir ../migrations/20261120131915_protect_team_records_and_roster.sql
\ir ../migrations/20261120132059_require_owner_for_team_records.sql

SET ROLE anon;
DO $$
BEGIN
  IF EXISTS (SELECT FROM public.team_members) OR has_function_privilege('public.get_team_roster_v1(text,boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Acesso anônimo indevido';
  END IF;
END;
$$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', false),
       set_config('request.jwt.claim.company_id', '10000000-0000-0000-0000-000000000001', false),
       set_config('request.jwt.claim.app_role', 'staff', false);
DO $$
DECLARE
  v_roster jsonb;
BEGIN
  IF (SELECT array_agg(name) FROM public.team_members) IS DISTINCT FROM ARRAY['Colaboradora A'] THEN
    RAISE EXCEPTION 'Colaborador recebeu linhas internas de terceiros';
  END IF;
  IF public.is_staff_of('10000000-0000-0000-0000-000000000001') IS DISTINCT FROM true
    OR public.is_staff_of('10000000-0000-0000-0000-000000000002') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'O vínculo histórico deixou de respeitar a empresa associada';
  END IF;

  SELECT jsonb_agg(to_jsonb(r)) INTO v_roster
  FROM public.get_team_roster_v1('10000000-0000-0000-0000-000000000001') r;
  IF jsonb_array_length(v_roster) IS DISTINCT FROM 2
    OR NOT (v_roster @> '[{"name":"Colega A"}]')
    OR EXISTS (SELECT FROM jsonb_array_elements(v_roster) AS e(item) WHERE item ?| ARRAY['commission_rate','commission_percent','cpf']) THEN
    RAISE EXCEPTION 'A lista operacional perdeu colegas ou revelou campos privados';
  END IF;

  IF (SELECT count(*) FROM public.get_team_roster_v1('10000000-0000-0000-0000-000000000001', true)) <> 3 THEN
    RAISE EXCEPTION 'A lista histórica perdeu um profissional inativo';
  END IF;

  BEGIN
    PERFORM public.get_team_roster_v1('10000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'A lista operacional aceitou uma empresa diferente';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO public.team_members (user_id, name)
    VALUES ('10000000-0000-0000-0000-000000000001', 'Registro indevido');
    RAISE EXCEPTION 'Colaborador conseguiu criar membro';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  UPDATE public.team_members SET commission_rate = 99;
  IF FOUND THEN RAISE EXCEPTION 'Colaborador conseguiu alterar membro'; END IF;
  DELETE FROM public.team_members;
  IF FOUND THEN RAISE EXCEPTION 'Colaborador conseguiu excluir membro'; END IF;
END;
$$;

SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', false);
DO $$
BEGIN
  IF (SELECT array_agg(name) FROM public.team_members) IS DISTINCT FROM ARRAY['Inativo A'] THEN
    RAISE EXCEPTION 'Registro do colaborador fora da agenda ficou indisponível';
  END IF;
  IF public.is_staff_of('10000000-0000-0000-0000-000000000001') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'O vínculo histórico aceitou colaborador inativo';
  END IF;
  IF (SELECT count(*) FROM public.get_team_roster_v1('10000000-0000-0000-0000-000000000001')) <> 2 THEN
    RAISE EXCEPTION 'Vínculo fora da agenda perdeu acesso à lista operacional';
  END IF;
END;
$$;

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false),
       set_config('request.jwt.claim.app_role', 'owner', false);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.team_members) <> 3 THEN
    RAISE EXCEPTION 'Dono perdeu sua equipe ou recebeu registros de outra empresa';
  END IF;

  INSERT INTO public.team_members (user_id, business_id, name)
    VALUES ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Novo membro');
  IF public.is_staff_of('10000000-0000-0000-0000-000000000002') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'O vínculo histórico interpretou outro identificador como convite aceito';
  END IF;
  UPDATE public.team_members SET commission_rate = 28 WHERE name = 'Colaboradora A';
  IF NOT FOUND THEN RAISE EXCEPTION 'Dono perdeu a edição de sua equipe'; END IF;

  BEGIN
    UPDATE public.team_members
    SET staff_user_id = '20000000-0000-0000-0000-000000000001' WHERE name = 'Novo membro';
    RAISE EXCEPTION 'O vínculo passou sem o fluxo de convite';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  UPDATE public.team_members SET name = 'Outro nome' WHERE name = 'Colaborador B';
  IF FOUND THEN RAISE EXCEPTION 'Dono conseguiu editar equipe de outra empresa'; END IF;
  DELETE FROM public.team_members WHERE name = 'Novo membro';
  IF NOT FOUND THEN RAISE EXCEPTION 'Dono perdeu a exclusão de sua equipe'; END IF;
END;
$$;

RESET ROLE;

CREATE FUNCTION public.accept_fixture_invite() RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.team_members SET staff_user_id = '20000000-0000-0000-0000-000000000005' WHERE name = 'Colega A'
$$;
SET ROLE authenticated;
SELECT public.accept_fixture_invite();
RESET ROLE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM public.team_members WHERE staff_user_id = '20000000-0000-0000-0000-000000000005' AND name = 'Colega A') THEN
    RAISE EXCEPTION 'A rotina privilegiada perdeu o vínculo do convite';
  END IF;
END;
$$;

\ir ../../docs/rollbacks/20261120132059_require_owner_for_team_records.rollback.sql
\ir ../../docs/rollbacks/20261120131915_protect_team_records_and_roster.rollback.sql

DO $$
BEGIN
  IF to_regprocedure('public.get_team_roster_v1(text,boolean)') IS NOT NULL
    OR to_regprocedure('public.guard_team_member_binding()') IS NOT NULL
    OR EXISTS (SELECT FROM pg_policy WHERE polrelid = 'public.team_members'::regclass AND polname LIKE 'team_records_%')
    OR (SELECT count(*) FROM public.team_members) <> 4 THEN
    RAISE EXCEPTION 'Rollback incompleto da proteção da equipe';
  END IF;
END;
$$;
