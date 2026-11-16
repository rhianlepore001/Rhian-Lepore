-- Catálogo reutilizável de materiais + recálculo de service_costs.amount.
-- Não aplicar em produção neste ciclo (draft empilhado). Só Postgres local descartável.

CREATE TABLE IF NOT EXISTS public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  name text NOT NULL,
  name_key text GENERATED ALWAYS AS (lower(name)) STORED,
  package_price numeric(12,2) NOT NULL CHECK (package_price >= 0),
  yield_mode text NOT NULL CHECK (yield_mode IN ('count', 'quantity')),
  yield_count numeric(12,4),
  package_qty numeric(12,4),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT materials_count_fields CHECK (yield_mode <> 'count' OR (yield_count IS NOT NULL AND yield_count > 0)),
  CONSTRAINT materials_quantity_fields CHECK (yield_mode <> 'quantity' OR (package_qty IS NOT NULL AND package_qty > 0)),
  UNIQUE (company_id, name_key)
);

CREATE TABLE IF NOT EXISTS public.service_material_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  service_id uuid NOT NULL REFERENCES public.services(id),
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  qty_per_service numeric(12,4),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, service_id, material_id),
  CONSTRAINT service_material_uses_qty CHECK (qty_per_service IS NULL OR qty_per_service >= 0)
);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_material_uses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS materials_owner ON public.materials;
CREATE POLICY materials_owner ON public.materials FOR ALL TO authenticated
  USING (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner')
  WITH CHECK (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner');

DROP POLICY IF EXISTS service_material_uses_owner ON public.service_material_uses;
CREATE POLICY service_material_uses_owner ON public.service_material_uses FOR ALL TO authenticated
  USING (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner')
  WITH CHECK (company_id = (SELECT public.get_auth_company_id()) AND (SELECT public.get_auth_role()) = 'owner');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials, public.service_material_uses TO authenticated;
REVOKE ALL ON public.materials, public.service_material_uses FROM anon;

CREATE OR REPLACE FUNCTION public.service_material_line_cost(
  p_mode text,
  p_package_price numeric,
  p_yield_count numeric,
  p_package_qty numeric,
  p_qty_per_service numeric
) RETURNS numeric
LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp AS $$
BEGIN
  IF p_package_price IS NULL OR p_package_price < 0 THEN RETURN NULL; END IF;
  IF p_mode = 'count' THEN
    IF p_yield_count IS NULL OR p_yield_count <= 0 THEN RETURN NULL; END IF;
    RETURN round(p_package_price / p_yield_count, 2);
  END IF;
  IF p_package_qty IS NULL OR p_package_qty <= 0 OR p_qty_per_service IS NULL OR p_qty_per_service < 0 THEN RETURN NULL; END IF;
  RETURN round(p_package_price * (p_qty_per_service / p_package_qty), 2);
END $$;
REVOKE ALL ON FUNCTION public.service_material_line_cost(text, numeric, numeric, numeric, numeric) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.recalc_service_material_cost(p_company_id text, p_service_id uuid) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_total numeric;
BEGIN
  SELECT round(COALESCE(sum(public.service_material_line_cost(m.yield_mode, m.package_price, m.yield_count, m.package_qty, u.qty_per_service)), 0), 2)
    INTO v_total
  FROM public.service_material_uses u
  JOIN public.materials m ON m.id = u.material_id AND m.company_id = u.company_id
  WHERE u.company_id = p_company_id AND u.service_id = p_service_id;
  IF NOT EXISTS (SELECT 1 FROM public.service_material_uses WHERE company_id = p_company_id AND service_id = p_service_id) THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.service_costs (company_id, service_id, amount)
  VALUES (p_company_id, p_service_id, v_total)
  ON CONFLICT (company_id, service_id) DO UPDATE SET amount = EXCLUDED.amount;
  RETURN v_total;
END $$;
REVOKE ALL ON FUNCTION public.recalc_service_material_cost(text, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.recalc_services_for_material() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r record; v_id uuid; v_company text;
BEGIN
  IF TG_TABLE_NAME = 'materials' THEN
    IF TG_OP = 'UPDATE' AND NEW.package_price IS NOT DISTINCT FROM OLD.package_price
       AND NEW.yield_count IS NOT DISTINCT FROM OLD.yield_count
       AND NEW.package_qty IS NOT DISTINCT FROM OLD.package_qty
       AND NEW.yield_mode IS NOT DISTINCT FROM OLD.yield_mode THEN
      RETURN NEW;
    END IF;
    v_id := NEW.id; v_company := NEW.company_id;
    FOR r IN SELECT DISTINCT service_id FROM public.service_material_uses WHERE material_id = v_id AND company_id = v_company
    LOOP
      PERFORM public.recalc_service_material_cost(v_company, r.service_id);
    END LOOP;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_service_material_cost(OLD.company_id, OLD.service_id);
    RETURN OLD;
  END IF;
  PERFORM public.recalc_service_material_cost(NEW.company_id, NEW.service_id);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.recalc_services_for_material() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS materials_recalc_services ON public.materials;
CREATE TRIGGER materials_recalc_services AFTER UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.recalc_services_for_material();

DROP TRIGGER IF EXISTS service_material_uses_recalc ON public.service_material_uses;
CREATE TRIGGER service_material_uses_recalc AFTER INSERT OR UPDATE OR DELETE ON public.service_material_uses
  FOR EACH ROW EXECUTE FUNCTION public.recalc_services_for_material();

CREATE OR REPLACE FUNCTION public.materials_validate_owner_reference() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.company_id IS DISTINCT FROM public.get_auth_company_id() OR public.get_auth_role() IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF TG_TABLE_NAME = 'service_material_uses' THEN
    IF NOT EXISTS (SELECT 1 FROM public.services s WHERE s.id = NEW.service_id AND s.user_id::text = NEW.company_id) THEN
      RAISE EXCEPTION 'invalid_service' USING ERRCODE = '23503';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.materials m WHERE m.id = NEW.material_id AND m.company_id = NEW.company_id) THEN
      RAISE EXCEPTION 'invalid_material' USING ERRCODE = '23503';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.materials_validate_owner_reference() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS materials_validate_owner ON public.materials;
CREATE TRIGGER materials_validate_owner BEFORE INSERT OR UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.materials_validate_owner_reference();

DROP TRIGGER IF EXISTS service_material_uses_validate_owner ON public.service_material_uses;
CREATE TRIGGER service_material_uses_validate_owner BEFORE INSERT OR UPDATE ON public.service_material_uses
  FOR EACH ROW EXECUTE FUNCTION public.materials_validate_owner_reference();
