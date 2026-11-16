-- Rollback local/admin-only. Nunca apontar para produção.
DROP TRIGGER IF EXISTS service_material_uses_validate_owner ON public.service_material_uses;
DROP TRIGGER IF EXISTS materials_validate_owner ON public.materials;
DROP TRIGGER IF EXISTS service_material_uses_recalc ON public.service_material_uses;
DROP TRIGGER IF EXISTS materials_recalc_services ON public.materials;
DROP FUNCTION IF EXISTS public.materials_validate_owner_reference();
DROP FUNCTION IF EXISTS public.recalc_services_for_material();
DROP FUNCTION IF EXISTS public.recalc_service_material_cost(text, uuid);
DROP FUNCTION IF EXISTS public.service_material_line_cost(text, numeric, numeric, numeric, numeric);
DROP TABLE IF EXISTS public.service_material_uses;
DROP TABLE IF EXISTS public.materials;
