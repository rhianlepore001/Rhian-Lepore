-- Verificação E3.1 (somente leitura) para rodar LOGO APÓS aplicar
-- 20260929090000_ex_staff_access.sql. Para cada perfil, simula o JWT dele e
-- compara get_auth_company_id() com o esperado:
--   staff com vínculo vivo em team_members (ativo ou inativo) -> a empresa;
--   staff sem vínculo vivo -> NULL;  dono -> o próprio id.
-- Resultado esperado em 29/09/2026: mantidos = 14, cortados = 8, divergências = 0.
-- Falha (RAISE EXCEPTION) se houver qualquer divergência.
BEGIN READ ONLY;
DO $$
DECLARE
  r record;
  v_expected text;
  v_got text;
  n_kept int := 0;
  n_cut int := 0;
  n_owner_bad int := 0;
  n_diff int := 0;
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
      IF v_got IS NULL THEN n_cut := n_cut + 1; ELSE n_kept := n_kept + 1; END IF;
    ELSIF v_got IS DISTINCT FROM r.id THEN
      n_owner_bad := n_owner_bad + 1;
    END IF;
    IF v_got IS DISTINCT FROM v_expected THEN n_diff := n_diff + 1; END IF;
  END LOOP;
  RAISE NOTICE 'ex_staff_access verify: staff mantidos=%, staff cortados=%, donos divergentes=%, divergencias=%',
    n_kept, n_cut, n_owner_bad, n_diff;
  IF n_diff > 0 OR n_owner_bad > 0 THEN
    RAISE EXCEPTION 'verificação falhou: % divergência(s), % dono(s) divergente(s)', n_diff, n_owner_bad;
  END IF;
END $$;
ROLLBACK;
