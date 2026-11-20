-- Rollback de 20261120120000_public_products_showcase.sql
-- Restaura get_public_products_catalog e get_checkout_products_v1 anteriores
-- e remove políticas de storage do bucket product_images.
-- Não apaga colunas nem o bucket automaticamente para evitar perda de dados.

BEGIN;

DROP POLICY IF EXISTS "product_images_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "product_images_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_public_select" ON storage.objects;

CREATE OR REPLACE FUNCTION public.get_public_products_catalog(p_business_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled BOOLEAN;
  v_result JSON;
BEGIN
  SELECT COALESCE(bs.public_products_enabled, FALSE)
  INTO v_enabled
  FROM public.business_settings bs
  WHERE bs.user_id::TEXT = p_business_id::TEXT
  LIMIT 1;

  IF NOT COALESCE(v_enabled, FALSE) THEN
    RETURN '[]'::json;
  END IF;

  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', p.id,
        'name', p.name,
        'sale_price', p.sale_price,
        'stock_quantity', p.stock_quantity
      )
      ORDER BY p.name ASC
    ),
    '[]'::json
  )
  INTO v_result
  FROM public.products p
  WHERE p.company_id::TEXT = p_business_id::TEXT
    AND p.is_active = TRUE
    AND p.show_in_public = TRUE
    AND p.stock_quantity > 0;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_products_catalog(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_checkout_products_v1(p_company_id TEXT, p_include_inactive BOOLEAN DEFAULT FALSE)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_auth_role(); result JSONB;
BEGIN
  IF auth.uid() IS NULL OR p_company_id IS DISTINCT FROM public.get_auth_company_id() OR COALESCE(v_role, '') NOT IN ('owner', 'staff') THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF v_role = 'staff' AND NOT EXISTS (
    SELECT 1 FROM public.team_members t
    WHERE t.user_id::TEXT = p_company_id AND t.staff_user_id = auth.uid() AND t.active AND t.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(
    jsonb_agg(
      CASE WHEN v_role = 'owner' THEN to_jsonb(p)
      ELSE jsonb_build_object(
        'id', p.id, 'company_id', p.company_id, 'name', p.name,
        'sale_price', p.sale_price, 'stock_quantity', p.stock_quantity,
        'min_stock_quantity', p.min_stock_quantity, 'is_active', p.is_active,
        'show_in_public', p.show_in_public
      ) END ORDER BY p.name
    ),
    '[]'
  ) INTO result
  FROM public.products p
  WHERE p.company_id::TEXT = p_company_id AND (p.is_active OR (p_include_inactive AND v_role = 'owner'));
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.get_checkout_products_v1(TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_checkout_products_v1(TEXT, BOOLEAN) TO authenticated;

COMMIT;
