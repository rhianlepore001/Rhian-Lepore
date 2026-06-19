-- ==========================================================================
-- SECURITY S2: Fechar superfície pública (RLS + RPCs com prova phone/tenant)
-- Sprint 1 — SEC-029, SEC-044, SEC-045, SEC-028 (parcial)
-- ==========================================================================

-- --------------------------------------------------------------------------
-- Helpers
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.phones_match(p_a TEXT, p_b TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN regexp_replace(COALESCE(p_a, ''), '\D', '', 'g') = '' THEN false
      WHEN regexp_replace(COALESCE(p_b, ''), '\D', '', 'g') = '' THEN false
      WHEN regexp_replace(p_a, '\D', '', 'g') = regexp_replace(p_b, '\D', '', 'g') THEN true
      ELSE (
        length(regexp_replace(p_a, '\D', '', 'g')) >= 8
        AND length(regexp_replace(p_b, '\D', '', 'g')) >= 8
        AND right(regexp_replace(p_a, '\D', '', 'g'), 8) = right(regexp_replace(p_b, '\D', '', 'g'), 8)
      )
    END;
$$;

-- --------------------------------------------------------------------------
-- 1. public_bookings — revogar SELECT global para anon
-- --------------------------------------------------------------------------

DROP POLICY IF EXISTS "public_bookings_select_anon" ON public.public_bookings;

-- --------------------------------------------------------------------------
-- 2. queue_entries — revogar SELECT cross-tenant
-- --------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public can view active queue" ON queue_entries;

-- --------------------------------------------------------------------------
-- 3. Catálogo público — revogar policies USING (true) / sem tenant
-- --------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public can view categories" ON service_categories;
DROP POLICY IF EXISTS "Public can view services" ON services;
DROP POLICY IF EXISTS "Public can view business settings" ON business_settings;
DROP POLICY IF EXISTS "Public can view team members" ON team_members;
DROP POLICY IF EXISTS "Public can view profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Public profiles visible" ON profiles;
DROP POLICY IF EXISTS "Public read profiles" ON profiles;
DROP POLICY IF EXISTS "Public can view business profiles only" ON profiles;
DROP POLICY IF EXISTS "Public can view active gallery images" ON business_galleries;

-- --------------------------------------------------------------------------
-- 4. RPCs — booking público com prova de telefone
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_booking_by_id(
  p_booking_id UUID,
  p_phone      TEXT
)
RETURNS SETOF public_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT pb.*
  FROM public_bookings pb
  WHERE pb.id = p_booking_id
    AND public.phones_match(pb.customer_phone, p_phone)
    AND pb.status IN ('pending', 'confirmed')
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION get_public_booking_by_id(
  p_booking_id  UUID,
  p_business_id UUID,
  p_phone       TEXT
)
RETURNS TABLE (
  id                UUID,
  customer_name     TEXT,
  customer_phone    TEXT,
  appointment_time  TIMESTAMPTZ,
  service_ids       UUID[],
  status            TEXT,
  business_id       UUID,
  professional_id   UUID,
  total_price       NUMERIC,
  duration_minutes  INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pb.id,
    pb.customer_name,
    pb.customer_phone,
    pb.appointment_time,
    pb.service_ids,
    pb.status,
    pb.business_id,
    pb.professional_id,
    pb.total_price,
    pb.duration_minutes
  FROM public_bookings pb
  WHERE pb.id = p_booking_id
    AND pb.business_id = p_business_id::text
    AND public.phones_match(pb.customer_phone, p_phone)
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION update_public_booking_by_client(
  p_booking_id                UUID,
  p_phone                     TEXT,
  p_service_ids               UUID[],
  p_professional_id           UUID,
  p_appointment_time          TIMESTAMPTZ,
  p_original_appointment_time TIMESTAMPTZ,
  p_customer_name             TEXT,
  p_customer_phone            TEXT,
  p_total_price               NUMERIC,
  p_duration_minutes          INTEGER
)
RETURNS SETOF public_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public_bookings pb
  SET
    service_ids               = p_service_ids,
    professional_id           = p_professional_id,
    appointment_time          = p_appointment_time,
    original_appointment_time = p_original_appointment_time,
    updated_at                = NOW(),
    customer_name             = p_customer_name,
    customer_phone            = p_customer_phone,
    total_price               = p_total_price,
    status                    = 'pending',
    duration_minutes          = p_duration_minutes,
    is_edit                   = true
  WHERE pb.id = p_booking_id
    AND public.phones_match(pb.customer_phone, p_phone)
    AND pb.status IN ('pending', 'confirmed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'update_public_booking_by_client: booking not found or not editable';
  END IF;

  RETURN QUERY
  SELECT pb.*
  FROM public_bookings pb
  WHERE pb.id = p_booking_id
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_booking_by_id(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_booking_by_id(UUID, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_public_booking_by_client(
  UUID, TEXT, UUID[], UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, NUMERIC, INTEGER
) TO anon, authenticated;

-- --------------------------------------------------------------------------
-- 5. RPCs — fila pública com prova de telefone
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION find_active_queue_entry_by_phone(
  p_business_id UUID,
  p_phone       TEXT
)
RETURNS SETOF queue_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT qe.*
  FROM queue_entries qe
  WHERE qe.business_id = p_business_id
    AND qe.status IN ('waiting', 'calling', 'serving')
    AND public.phones_match(qe.client_phone, p_phone)
  ORDER BY qe.joined_at DESC
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION get_queue_entry_public(
  p_entry_id UUID,
  p_phone    TEXT
)
RETURNS SETOF queue_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT qe.*
  FROM queue_entries qe
  WHERE qe.id = p_entry_id
    AND public.phones_match(qe.client_phone, p_phone)
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION get_public_business_profile_minimal(p_business_id UUID)
RETURNS TABLE (
  id            UUID,
  business_name TEXT,
  user_type     TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.business_name, p.user_type
  FROM profiles p
  WHERE p.id = p_business_id::text
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION find_active_queue_entry_by_phone(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_queue_entry_public(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_business_profile_minimal(UUID) TO anon, authenticated;

-- --------------------------------------------------------------------------
-- 6. RPCs — catálogo público scoped por tenant
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_public_profile_by_slug(p_slug TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'id', p.id,
    'business_name', p.business_name,
    'user_type', p.user_type,
    'google_rating', p.google_rating,
    'total_reviews', p.total_reviews,
    'phone', p.phone,
    'enable_upsells', p.enable_upsells,
    'enable_professional_selection', p.enable_professional_selection,
    'logo_url', p.logo_url,
    'cover_photo_url', p.cover_photo_url,
    'address_street', p.address_street,
    'instagram_handle', p.instagram_handle,
    'region', p.region,
    'business_slug', p.business_slug
  )
  INTO v_result
  FROM profiles p
  WHERE p.business_slug = p_slug
  LIMIT 1;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_public_business_settings_json(p_business_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT to_jsonb(bs.*)::json
  INTO v_result
  FROM business_settings bs
  WHERE bs.user_id::text = p_business_id::text
  LIMIT 1;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_public_services_catalog(p_business_id UUID)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    json_agg(s ORDER BY s.price ASC),
    '[]'::json
  )
  FROM services s
  WHERE s.user_id::text = p_business_id::text
    AND s.active = true;
$$;

CREATE OR REPLACE FUNCTION get_public_categories_catalog(p_business_id UUID)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    json_agg(json_build_object('id', c.id, 'name', c.name) ORDER BY c.display_order),
    '[]'::json
  )
  FROM service_categories c
  WHERE c.user_id::text = p_business_id::text;
$$;

CREATE OR REPLACE FUNCTION get_public_team_catalog(p_business_id UUID)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    json_agg(tm ORDER BY tm.display_order),
    '[]'::json
  )
  FROM team_members tm
  WHERE tm.user_id::text = p_business_id::text
    AND tm.active = true;
$$;

CREATE OR REPLACE FUNCTION get_public_gallery_catalog(p_business_id UUID)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    json_agg(bg ORDER BY bg.display_order),
    '[]'::json
  )
  FROM business_galleries bg
  WHERE bg.user_id::text = p_business_id::text
    AND bg.is_active = true;
$$;

GRANT EXECUTE ON FUNCTION get_public_profile_by_slug(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_business_settings_json(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_services_catalog(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_categories_catalog(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_team_catalog(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_gallery_catalog(UUID) TO anon, authenticated;

-- --------------------------------------------------------------------------
-- 7. Espelhamento CRM — server-side, sem grant anon na RPC
-- --------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION mirror_public_client_to_crm(TEXT, TEXT, TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION mirror_public_client_to_crm(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION trg_mirror_public_client_to_crm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM mirror_public_client_to_crm(
    NEW.business_id::text,
    NEW.name,
    NEW.phone,
    NEW.email,
    NEW.photo_url
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mirror_public_client_after_upsert ON public_clients;
CREATE TRIGGER mirror_public_client_after_upsert
  AFTER INSERT OR UPDATE OF name, phone, email, photo_url
  ON public_clients
  FOR EACH ROW
  EXECUTE FUNCTION trg_mirror_public_client_to_crm();
