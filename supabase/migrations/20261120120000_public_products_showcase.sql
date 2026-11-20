-- =============================================================================
-- Vitrine pública de produtos: foto, descrição, RPC mínimo e Storage isolado
--
-- 1. public.products: adiciona image_url e description (opcionais)
-- 2. public.business_settings: garante public_products_enabled (DEFAULT FALSE)
-- 3. public.get_checkout_products_v1: inclui image_url e description para equipe
--    (owner continua recebendo to_jsonb(p); staff segue sem cost_price)
-- 4. public.get_public_products_catalog: retorna apenas o mínimo necessário
--    (id, name, description, sale_price, image_url) — NUNCA cost_price nem
--    stock_quantity exato; filtra is_active, show_in_public e stock_quantity > 0
--    apenas quando business_settings.public_products_enabled = TRUE
-- 5. Storage bucket product_images: leitura pública, escrita (INSERT/UPDATE/DELETE)
--    restrita à pasta da empresa (get_auth_company_id()) e apenas para owner
--
-- Rollback: docs/rollbacks/20261120120000_public_products_showcase.rollback.sql
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Colunas de foto e descrição em public.products
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.products.image_url IS
  'URL pública da foto do produto no bucket product_images (opcional).';

COMMENT ON COLUMN public.products.description IS
  'Descrição curta opcional do produto exibida na vitrine pública.';

-- ---------------------------------------------------------------------------
-- 2. Garante flag de exibição pública (padrão desligado)
-- ---------------------------------------------------------------------------
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS public_products_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Garante que visitantes anônimos nunca consultem public.products diretamente.
REVOKE ALL ON TABLE public.products FROM anon;

-- ---------------------------------------------------------------------------
-- 3. Atualiza get_checkout_products_v1 para projetar image_url e description
--    também para colaboradores (sem expor cost_price).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_checkout_products_v1(
  p_company_id TEXT,
  p_include_inactive BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT := public.get_auth_role();
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL
    OR p_company_id IS DISTINCT FROM public.get_auth_company_id()
    OR COALESCE(v_role, '') NOT IN ('owner', 'staff')
  THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF v_role = 'staff' AND NOT EXISTS (
    SELECT 1
    FROM public.team_members t
    WHERE t.user_id::TEXT = p_company_id
      AND t.staff_user_id = auth.uid()
      AND t.active
      AND t.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      CASE
        WHEN v_role = 'owner' THEN to_jsonb(p)
        ELSE jsonb_build_object(
          'id', p.id,
          'company_id', p.company_id,
          'name', p.name,
          'description', p.description,
          'image_url', p.image_url,
          'sale_price', p.sale_price,
          'stock_quantity', p.stock_quantity,
          'min_stock_quantity', p.min_stock_quantity,
          'is_active', p.is_active,
          'show_in_public', p.show_in_public
        )
      END
      ORDER BY p.name ASC
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM public.products p
  WHERE p.company_id::TEXT = p_company_id
    AND (p.is_active OR (p_include_inactive AND v_role = 'owner'));

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_checkout_products_v1(TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_checkout_products_v1(TEXT, BOOLEAN) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Catálogo público de produtos (somente leitura, projeção mínima)
--    Nunca expõe cost_price, stock_quantity exato, comissão ou outro tenant.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_products_catalog(p_business_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_enabled BOOLEAN;
  v_result JSON;
BEGIN
  IF p_business_id IS NULL THEN
    RETURN '[]'::json;
  END IF;

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
        'description', p.description,
        'sale_price', p.sale_price,
        'image_url', p.image_url
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

REVOKE ALL ON FUNCTION public.get_public_products_catalog(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_products_catalog(UUID) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Storage: bucket product_images com escrita restrita ao dono da empresa
--    Path obrigatório: {company_id}/{arquivo}
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product_images',
  'product_images',
  TRUE,
  2097152,
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "product_images_public_select" ON storage.objects;
CREATE POLICY "product_images_public_select"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'product_images');

DROP POLICY IF EXISTS "product_images_owner_insert" ON storage.objects;
CREATE POLICY "product_images_owner_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product_images'
    AND (storage.foldername(name))[1] = public.get_auth_company_id()
    AND public.get_auth_role() = 'owner'
  );

DROP POLICY IF EXISTS "product_images_owner_update" ON storage.objects;
CREATE POLICY "product_images_owner_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product_images'
    AND (storage.foldername(name))[1] = public.get_auth_company_id()
    AND public.get_auth_role() = 'owner'
  )
  WITH CHECK (
    bucket_id = 'product_images'
    AND (storage.foldername(name))[1] = public.get_auth_company_id()
    AND public.get_auth_role() = 'owner'
  );

DROP POLICY IF EXISTS "product_images_owner_delete" ON storage.objects;
CREATE POLICY "product_images_owner_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product_images'
    AND (storage.foldername(name))[1] = public.get_auth_company_id()
    AND public.get_auth_role() = 'owner'
  );

COMMIT;
