-- Public client session: fix phone lookup + SECURITY DEFINER upsert for anon booking flow

DROP FUNCTION IF EXISTS get_public_client_by_phone(UUID, TEXT);

CREATE OR REPLACE FUNCTION get_public_client_by_phone(
  p_business_id UUID,
  p_phone TEXT
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  photo_url TEXT,
  business_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.email, c.phone, c.photo_url, c.business_id
  FROM public_clients c
  WHERE c.business_id = p_business_id
    AND public.phones_match(c.phone, p_phone);
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_client_by_phone(UUID, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION upsert_public_client(
  p_business_id UUID,
  p_name TEXT,
  p_phone TEXT,
  p_photo_url TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  photo_url TEXT,
  business_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
BEGIN
  SELECT c.id INTO v_existing_id
  FROM public_clients c
  WHERE c.business_id = p_business_id
    AND public.phones_match(c.phone, p_phone)
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public_clients
    SET
      name = COALESCE(NULLIF(trim(p_name), ''), name),
      photo_url = COALESCE(p_photo_url, photo_url),
      email = COALESCE(p_email, email),
      last_booking_at = NOW()
    WHERE id = v_existing_id;

    RETURN QUERY
    SELECT c.id, c.name, c.email, c.phone, c.photo_url, c.business_id
    FROM public_clients c
    WHERE c.id = v_existing_id;
  ELSE
    RETURN QUERY
    INSERT INTO public_clients (business_id, name, phone, photo_url, email, last_booking_at)
    VALUES (p_business_id, p_name, p_phone, p_photo_url, p_email, NOW())
    RETURNING id, name, email, phone, photo_url, business_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_public_client(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
