-- P0 hotfix: agendamento público anon (INSERT + RETURNING).
-- Data: 2026-09-18
--
-- Causa:
--   1) public_bookings_insert_anon WITH CHECK fazia EXISTS em profiles.
--      Anon não tem SELECT em profiles → EXISTS sempre false → 42501.
--   2) supabase-js .insert().select() gera INSERT...RETURNING. Sem policy
--      SELECT, RETURNING também é 42501 mesmo com WITH CHECK ok.
--
-- Correção (idempotente; já aplicada no remoto BARBER/Beauty OS):
--   - business_exists(text) SECURITY DEFINER (profiles.id é TEXT)
--   - policy INSERT usa o helper; status só pending; SEM WITH CHECK (true)
--   - create_public_booking(...) DEFINER força status=pending
--   - SELECT anon só pending AND created_at > now()-2min (legado .select())
--
-- create_secure_booking continua sem EXECUTE para anon.
-- TODO(follow-up): recompute total_price/duration_minutes a partir de
--   public.services (e product_lines em products) em vez do payload do cliente.

-- --------------------------------------------------------------------------
-- 1) Helper: existência do negócio sem SELECT anon em profiles
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.business_exists(p_business_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_business_id
  );
$$;

REVOKE ALL ON FUNCTION public.business_exists(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.business_exists(text) TO anon, authenticated;

-- --------------------------------------------------------------------------
-- 2) INSERT anon: business_id válido + status pending
-- --------------------------------------------------------------------------

DROP POLICY IF EXISTS "public_bookings_insert_anon" ON public.public_bookings;
DROP POLICY IF EXISTS public_bookings_insert_anon ON public.public_bookings;

CREATE POLICY "public_bookings_insert_anon"
  ON public.public_bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    business_id IS NOT NULL
    AND btrim(business_id) <> ''
    AND public.business_exists(business_id)
    AND COALESCE(status, 'pending') = 'pending'
  );

GRANT INSERT ON public.public_bookings TO anon;
GRANT INSERT ON public.public_bookings TO authenticated;

-- --------------------------------------------------------------------------
-- 3) RPC pública de create — força pending, devolve a row (sem SELECT amplo)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_public_booking(
  p_business_id text,
  p_customer_name text,
  p_customer_phone text,
  p_service_ids uuid[],
  p_appointment_time timestamptz,
  p_total_price numeric,
  p_duration_minutes integer DEFAULT NULL,
  p_professional_id uuid DEFAULT NULL,
  p_customer_email text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_product_lines jsonb DEFAULT '[]'::jsonb
)
RETURNS public.public_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.public_bookings;
BEGIN
  IF p_business_id IS NULL OR btrim(p_business_id) = '' OR NOT public.business_exists(p_business_id) THEN
    RAISE EXCEPTION 'invalid_business' USING ERRCODE = '42501';
  END IF;
  IF p_customer_phone IS NULL OR btrim(p_customer_phone) = '' THEN
    RAISE EXCEPTION 'phone_required' USING ERRCODE = '22023';
  END IF;
  IF p_service_ids IS NULL OR cardinality(p_service_ids) = 0 THEN
    RAISE EXCEPTION 'services_required' USING ERRCODE = '22023';
  END IF;
  IF p_appointment_time IS NULL THEN
    RAISE EXCEPTION 'appointment_required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.public_bookings (
    business_id,
    status,
    customer_name,
    customer_phone,
    customer_email,
    service_ids,
    professional_id,
    appointment_time,
    total_price,
    duration_minutes,
    notes,
    payment_method,
    product_lines
  ) VALUES (
    p_business_id,
    'pending',
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_service_ids,
    p_professional_id,
    p_appointment_time,
    COALESCE(p_total_price, 0),
    p_duration_minutes,
    p_notes,
    p_payment_method,
    COALESCE(p_product_lines, '[]'::jsonb)
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_public_booking(text, text, text, uuid[], timestamptz, numeric, integer, uuid, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_booking(text, text, text, uuid[], timestamptz, numeric, integer, uuid, text, text, text, jsonb) TO anon, authenticated;

-- --------------------------------------------------------------------------
-- 4) SELECT estreito: só pending criado nos últimos 2 minutos (RETURNING legado)
--    Não alarga leitura de confirmed/histórico.
-- --------------------------------------------------------------------------

DROP POLICY IF EXISTS "public_bookings_select_anon_fresh" ON public.public_bookings;
DROP POLICY IF EXISTS public_bookings_select_anon_fresh ON public.public_bookings;

CREATE POLICY "public_bookings_select_anon_fresh"
  ON public.public_bookings
  FOR SELECT
  TO anon
  USING (
    status = 'pending'
    AND created_at IS NOT NULL
    AND created_at > now() - interval '2 minutes'
  );
