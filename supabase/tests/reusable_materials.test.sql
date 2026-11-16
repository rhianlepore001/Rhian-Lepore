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
