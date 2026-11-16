-- Rollback local/admin-only. Nunca apontar para produção.
-- Restaura o último service_costs.amount presente imediatamente antes de
-- cada recálculo automático (tabela service_costs_material_recalc_backup).
-- Sem backup, os totais recalculados permanecem — este arquivo não adivinha
-- o valor antigo. Não é um histórico de todas as mudanças.

SELECT public.restore_service_costs_from_material_recalc_backup();

DROP TRIGGER IF EXISTS service_material_uses_validate_owner ON public.service_material_uses;
DROP TRIGGER IF EXISTS materials_validate_owner ON public.materials;
DROP TRIGGER IF EXISTS service_material_uses_recalc ON public.service_material_uses;
DROP TRIGGER IF EXISTS materials_recalc_services ON public.materials;
DROP FUNCTION IF EXISTS public.materials_validate_owner_reference();
DROP FUNCTION IF EXISTS public.recalc_services_for_material();
DROP FUNCTION IF EXISTS public.restore_service_costs_from_material_recalc_backup();
DROP FUNCTION IF EXISTS public.recalc_service_material_cost(text, uuid);
DROP FUNCTION IF EXISTS public.service_material_line_cost(text, numeric, numeric, numeric, numeric);
DROP TABLE IF EXISTS public.service_material_uses;
DROP TABLE IF EXISTS public.materials;
DROP TABLE IF EXISTS public.service_costs_material_recalc_backup;
