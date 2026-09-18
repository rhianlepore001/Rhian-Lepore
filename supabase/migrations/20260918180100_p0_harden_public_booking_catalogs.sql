-- P0: endurece INSERT anon em public_bookings e allowlist de colunas no catálogo.
-- Data: 2026-09-18
-- Contexto: policy vigente public_bookings_insert_anon WITH CHECK (true)
--   (20260321_fix_public_bookings_rls_definitive.sql). Catálogos públicos
--   dumpam linha inteira: to_jsonb(bs.*) / json_agg(s|tm|bg)
--   (20260613_security_s2_public_rls.sql). Assinaturas abaixo são as últimas
--   CREATE OR REPLACE dessas funções no repo (nunca redefinidas depois).
-- Pix de pagamento continua em get_public_pix_config (allowlist da 180000).

-- --------------------------------------------------------------------------
-- c) INSERT público: business_id obrigatório + status só pending
--    Owner autenticado segue com "Owner can manage public_bookings" (FOR ALL).
-- --------------------------------------------------------------------------

DROP POLICY IF EXISTS "public_bookings_insert_anon" ON public.public_bookings;
DROP POLICY IF EXISTS "Public bookings: public insert" ON public.public_bookings;
DROP POLICY IF EXISTS "Public bookings: public create" ON public.public_bookings;
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.public_bookings;
DROP POLICY IF EXISTS "Public can create bookings" ON public.public_bookings;

CREATE POLICY "public_bookings_insert_anon"
  ON public.public_bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    business_id IS NOT NULL
    AND btrim(business_id::text) <> ''
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = public_bookings.business_id
    )
    AND COALESCE(status, 'pending') = 'pending'
  );

GRANT INSERT ON public.public_bookings TO anon;
GRANT INSERT ON public.public_bookings TO authenticated;

-- --------------------------------------------------------------------------
-- d) Catálogo público — colunas explícitas (sem comissão, pix, staff_user_id)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_public_business_settings_json(p_business_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'business_hours', bs.business_hours,
    'cancellation_policy', bs.cancellation_policy,
    'enable_self_rescheduling', bs.enable_self_rescheduling,
    'public_products_enabled', bs.public_products_enabled,
    'queue_mode', bs.queue_mode,
    'queue_allow_leave', bs.queue_allow_leave,
    'queue_late_minutes', bs.queue_late_minutes
  )
  INTO v_result
  FROM public.business_settings bs
  WHERE bs.user_id::text = p_business_id::text
  LIMIT 1;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_services_catalog(p_business_id UUID)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', s.id,
        'name', s.name,
        'description', s.description,
        'price', s.price,
        'duration_minutes', s.duration_minutes,
        'category_id', s.category_id,
        'image_url', s.image_url,
        'active', s.active,
        'display_order', s.display_order
      )
      ORDER BY s.price ASC
    ),
    '[]'::json
  )
  FROM public.services s
  WHERE s.user_id::text = p_business_id::text
    AND s.active = true;
$$;

CREATE OR REPLACE FUNCTION public.get_public_team_catalog(p_business_id UUID)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', tm.id,
        'name', tm.name,
        'full_name', tm.name,
        'slug', tm.slug,
        'role', tm.role,
        'bio', tm.bio,
        'photo_url', tm.photo_url,
        'active', tm.active,
        'display_order', tm.display_order,
        'is_owner', tm.is_owner
      )
      ORDER BY tm.display_order
    ),
    '[]'::json
  )
  FROM public.team_members tm
  WHERE tm.user_id::text = p_business_id::text
    AND tm.active = true;
$$;

CREATE OR REPLACE FUNCTION public.get_public_gallery_catalog(p_business_id UUID)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', bg.id,
        'image_url', bg.image_url,
        'display_order', bg.display_order
      )
      ORDER BY bg.display_order
    ),
    '[]'::json
  )
  FROM public.business_galleries bg
  WHERE bg.user_id::text = p_business_id::text
    AND bg.is_active = true;
$$;

REVOKE ALL ON FUNCTION public.get_public_business_settings_json(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_services_catalog(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_team_catalog(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_gallery_catalog(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_public_business_settings_json(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_services_catalog(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_team_catalog(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_gallery_catalog(UUID) TO anon, authenticated;
