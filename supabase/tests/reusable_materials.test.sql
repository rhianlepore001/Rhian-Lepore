-- Executar só em Postgres 17 local descartável. Nunca produção.
\set ON_ERROR_STOP on

SET request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
SET ROLE authenticated;

INSERT INTO public.materials (company_id, name, package_price, yield_mode, yield_count)
VALUES ('10000000-0000-0000-0000-000000000001', 'Giletes', 20, 'count', 40);

INSERT INTO public.materials (company_id, name, package_price, yield_mode, package_qty)
VALUES ('10000000-0000-0000-0000-000000000001', 'Progressiva', 100, 'quantity', 1000);

INSERT INTO public.service_material_uses (company_id, service_id, material_id)
SELECT '10000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001', id
FROM public.materials WHERE name = 'Giletes';

INSERT INTO public.service_material_uses (company_id, service_id, material_id)
SELECT '10000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000002', id
FROM public.materials WHERE name = 'Giletes';

INSERT INTO public.service_material_uses (company_id, service_id, material_id, qty_per_service)
SELECT '10000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001', id, 60
FROM public.materials WHERE name = 'Progressiva';

DO $$ BEGIN
  IF (SELECT amount FROM public.service_costs WHERE service_id = '93000000-0000-0000-0000-000000000001') IS DISTINCT FROM 6.50 THEN
    RAISE EXCEPTION 'corte deveria ser 0,50 + 6,00 = 6,50: %', (SELECT amount FROM public.service_costs WHERE service_id = '93000000-0000-0000-0000-000000000001');
  END IF;
  IF (SELECT amount FROM public.service_costs WHERE service_id = '93000000-0000-0000-0000-000000000002') IS DISTINCT FROM 0.50 THEN
    RAISE EXCEPTION 'sobrancelha deveria ser 0,50: %', (SELECT amount FROM public.service_costs WHERE service_id = '93000000-0000-0000-0000-000000000002');
  END IF;
END $$;

UPDATE public.materials SET package_price = 40 WHERE name = 'Giletes';

DO $$ BEGIN
  IF (SELECT amount FROM public.service_costs WHERE service_id = '93000000-0000-0000-0000-000000000001') IS DISTINCT FROM 7.00 THEN
    RAISE EXCEPTION 'depois do preço: corte 1,00 + 6,00 = 7,00: %', (SELECT amount FROM public.service_costs WHERE service_id = '93000000-0000-0000-0000-000000000001');
  END IF;
  IF (SELECT amount FROM public.service_costs WHERE service_id = '93000000-0000-0000-0000-000000000002') IS DISTINCT FROM 1.00 THEN
    RAISE EXCEPTION 'depois do preço: sobrancelha 1,00: %', (SELECT amount FROM public.service_costs WHERE service_id = '93000000-0000-0000-0000-000000000002');
  END IF;
END $$;

-- TDD red: arredondamento só no total (igual JS roundMoney no reduce), não round por linha.
INSERT INTO public.services (id, user_id, name)
VALUES ('93000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Tres linhas count');

INSERT INTO public.materials (company_id, name, package_price, yield_mode, yield_count) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Count A', 20, 'count', 3),
  ('10000000-0000-0000-0000-000000000001', 'Count B', 20, 'count', 3),
  ('10000000-0000-0000-0000-000000000001', 'Count C', 20, 'count', 3);

INSERT INTO public.service_material_uses (company_id, service_id, material_id)
SELECT '10000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000003', id
FROM public.materials WHERE name IN ('Count A', 'Count B', 'Count C');

DO $$ BEGIN
  IF (SELECT amount FROM public.service_costs WHERE service_id = '93000000-0000-0000-0000-000000000003') IS DISTINCT FROM 20.00 THEN
    RAISE EXCEPTION 'três linhas 20/3 devem totalizar 20,00 (não 20,01 por round por linha): %',
      (SELECT amount FROM public.service_costs WHERE service_id = '93000000-0000-0000-0000-000000000003');
  END IF;
END $$;

-- TDD red: sem usos, service_costs não pode manter amount antigo.
DELETE FROM public.service_material_uses
WHERE company_id = '10000000-0000-0000-0000-000000000001'
  AND service_id = '93000000-0000-0000-0000-000000000002';

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM public.service_costs
    WHERE service_id = '93000000-0000-0000-0000-000000000002'
      AND amount IS NOT DISTINCT FROM 1.00
  ) THEN
    RAISE EXCEPTION 'apagar todos os usos deve anular/apagar service_costs (não manter 1,00)';
  END IF;
END $$;

-- TDD red: quantity com qty_per_service NULL é linha incompleta — não gravar 0,00.
INSERT INTO public.services (id, user_id, name)
VALUES ('93000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Qty incompleta');

INSERT INTO public.materials (company_id, name, package_price, yield_mode, package_qty)
VALUES ('10000000-0000-0000-0000-000000000001', 'Sem qtd por atendimento', 100, 'quantity', 1000);

INSERT INTO public.service_material_uses (company_id, service_id, material_id)
SELECT '10000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000004', id
FROM public.materials WHERE name = 'Sem qtd por atendimento';

DO $$ BEGIN
  IF (SELECT amount FROM public.service_costs WHERE service_id = '93000000-0000-0000-0000-000000000004') IS NOT DISTINCT FROM 0.00 THEN
    RAISE EXCEPTION 'qty_per_service NULL não deve virar total 0,00 (tratar como não informado)';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.service_costs
    WHERE service_id = '93000000-0000-0000-0000-000000000004'
  ) THEN
    RAISE EXCEPTION 'linha incompleta não deve criar service_costs com valor fictício';
  END IF;
END $$;

-- TDD red: rollback deve usar backup service_costs_material_recalc_backup (company_id, service_id, amount).
DO $$ BEGIN
  IF to_regclass('public.service_costs_material_recalc_backup') IS NULL THEN
    RAISE EXCEPTION 'rollback red: falta tabela service_costs_material_recalc_backup (company_id, service_id, amount)';
  END IF;
END $$;

INSERT INTO public.service_costs (company_id, service_id, amount)
VALUES ('10000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000003', 9.99)
ON CONFLICT (company_id, service_id) DO UPDATE SET amount = EXCLUDED.amount;

UPDATE public.materials SET package_price = 21 WHERE name = 'Count A';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.service_costs_material_recalc_backup
    WHERE company_id = '10000000-0000-0000-0000-000000000001'
      AND service_id = '93000000-0000-0000-0000-000000000003'
      AND amount IS NOT DISTINCT FROM 9.99
  ) THEN
    RAISE EXCEPTION 'backup deve guardar amount original 9,99 antes do recálculo automático';
  END IF;
END $$;

RESET ROLE;
DO $$ BEGIN
  PERFORM public.restore_service_costs_from_material_recalc_backup();
  IF (SELECT amount FROM public.service_costs WHERE service_id = '93000000-0000-0000-0000-000000000003') IS DISTINCT FROM 9.99 THEN
    RAISE EXCEPTION 'restore_service_costs_from_material_recalc_backup deveria restaurar 9,99: %',
      (SELECT amount FROM public.service_costs WHERE service_id = '93000000-0000-0000-0000-000000000003');
  END IF;
END $$;

RESET ROLE;
SET request.jwt.claim.sub = '20000000-0000-0000-0000-000000000002';
SET ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.materials) <> 0 THEN
    RAISE EXCEPTION 'tenant B não pode ler materiais de A';
  END IF;
  BEGIN
    INSERT INTO public.materials (company_id, name, package_price, yield_mode, yield_count)
    VALUES ('10000000-0000-0000-0000-000000000001', 'Hack', 1, 'count', 1);
    RAISE EXCEPTION 'tenant B escreveu no catálogo de A';
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN
    IF SQLERRM LIKE 'tenant B escreveu%' THEN RAISE; END IF;
  END;
END $$;

RESET ROLE;
SET request.jwt.claim.sub = '10000000-0000-0000-0000-00000000000a';
SET ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.materials) <> 0 THEN
    RAISE EXCEPTION 'staff não lê o catálogo';
  END IF;
  BEGIN
    INSERT INTO public.materials (company_id, name, package_price, yield_mode, yield_count)
    VALUES ('10000000-0000-0000-0000-000000000001', 'Staff', 1, 'count', 1);
    RAISE EXCEPTION 'staff escreveu no catálogo';
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN
    IF SQLERRM LIKE 'staff escreveu%' THEN RAISE; END IF;
  END;
END $$;

RESET ROLE;
DO $$ BEGIN
  RAISE NOTICE 'reusable materials SQL tests: OK';
END $$;
