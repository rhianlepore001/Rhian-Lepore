-- Verificação E3.1 (somente leitura) para rodar LOGO APÓS aplicar
-- 20260929090000_ex_staff_access.sql. Para cada perfil, simula o JWT dele e
-- compara get_auth_company_id() com o esperado:
--   staff com vínculo vivo em team_members (ativo ou inativo) -> a empresa;
--   staff sem vínculo vivo -> NULL;  dono -> o próprio id.
-- Além das divergências, confere a LISTA exata de contas cortadas (prefixo de 8
-- caracteres do id) e o total de mantidos lidos em prod em 29/09/2026:
--   mantidos = 14; cortados = 8: 05d4e8a3, 4ad11be2, 78052ac0, 8a072e1c,
--   b4839180, b72cc527, ed3daed7, fcbe1f6b.
-- Falha (RAISE EXCEPTION, psql sai com código 3) se algo não bater.
--
-- Como rodar em prod (conexão direta, papel postgres; é só leitura e termina
-- em ROLLBACK):
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
--     -f docs/rollbacks/20260929090000_ex_staff_access_verify.sql
-- Saída esperada: NOTICE "... staff mantidos=14, staff cortados=8, donos
-- divergentes=0, divergencias=0, lista de cortados confere". Se alguém entrou
-- ou saiu da equipe desde 29/09, sobrescreva o esperado:
--   -v expected_kept=15 -v expected_cut='05d4e8a3,4ad11be2,...'
\if :{?expected_kept}
\else
  \set expected_kept 14
\endif
\if :{?expected_cut}
\else
  \set expected_cut '05d4e8a3,4ad11be2,78052ac0,8a072e1c,b4839180,b72cc527,ed3daed7,fcbe1f6b'
\endif
BEGIN READ ONLY;
SELECT set_config('ex_staff_verify.expected_kept', :'expected_kept', true),
       set_config('ex_staff_verify.expected_cut', :'expected_cut', true) \gset verify_
DO $$
DECLARE
  r record;
  v_expected text;
  v_got text;
  n_kept int := 0;
  n_cut int := 0;
  n_owner_bad int := 0;
  n_diff int := 0;
  v_cut_ids text[] := '{}';
  v_want_kept int := current_setting('ex_staff_verify.expected_kept')::int;
  v_want_cut text[] := string_to_array(replace(current_setting('ex_staff_verify.expected_cut'), ' ', ''), ',');
  v_unexpected text[];
  v_missing text[];
BEGIN
  FOR r IN
    SELECT p.id, p.role, COALESCE(NULLIF(btrim(p.company_id), ''), p.id) AS company
    FROM public.profiles p
  LOOP
    IF r.role = 'staff' AND r.company <> r.id AND NOT EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.staff_user_id::text = r.id AND tm.user_id = r.company AND tm.deleted_at IS NULL
    ) THEN
      v_expected := NULL;
    ELSE
      v_expected := r.company;
    END IF;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', r.id, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.sub', r.id, true);
    v_got := public.get_auth_company_id();
    IF r.role = 'staff' THEN
      IF v_got IS NULL THEN
        n_cut := n_cut + 1;
        v_cut_ids := v_cut_ids || r.id;
      ELSE
        n_kept := n_kept + 1;
      END IF;
    ELSIF v_got IS DISTINCT FROM r.id THEN
      n_owner_bad := n_owner_bad + 1;
    END IF;
    IF v_got IS DISTINCT FROM v_expected THEN n_diff := n_diff + 1; END IF;
  END LOOP;

  -- cortado que não está na lista esperada / esperado que não foi cortado
  SELECT array_agg(c ORDER BY c) INTO v_unexpected
  FROM unnest(v_cut_ids) c
  WHERE NOT EXISTS (SELECT 1 FROM unnest(v_want_cut) w WHERE c LIKE w || '%');
  SELECT array_agg(w ORDER BY w) INTO v_missing
  FROM unnest(v_want_cut) w
  WHERE NOT EXISTS (SELECT 1 FROM unnest(v_cut_ids) c WHERE c LIKE w || '%');

  RAISE NOTICE 'ex_staff_access verify: staff mantidos=%, staff cortados=%, donos divergentes=%, divergencias=%, lista de cortados %',
    n_kept, n_cut, n_owner_bad, n_diff,
    CASE WHEN v_unexpected IS NULL AND v_missing IS NULL THEN 'confere' ELSE 'DIFERE' END;
  IF n_diff > 0 OR n_owner_bad > 0 THEN
    RAISE EXCEPTION 'verificação falhou: % divergência(s), % dono(s) divergente(s)', n_diff, n_owner_bad;
  END IF;
  IF n_kept <> v_want_kept OR n_cut <> cardinality(v_want_cut) THEN
    RAISE EXCEPTION 'verificação falhou: esperado % mantidos e % cortados, veio % e %',
      v_want_kept, cardinality(v_want_cut), n_kept, n_cut;
  END IF;
  IF v_unexpected IS NOT NULL OR v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'verificação falhou: cortados fora da lista % ; esperados e não cortados %',
      COALESCE(v_unexpected::text, '{}'), COALESCE(v_missing::text, '{}');
  END IF;
END $$;
ROLLBACK;
