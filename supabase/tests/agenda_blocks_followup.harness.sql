-- Extras para o follow-up do bloqueio. Funções copiadas do live (leitura em 2026-10-03).
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS is_owner boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.public_bookings
  ADD COLUMN IF NOT EXISTS original_appointment_time timestamptz;

CREATE OR REPLACE FUNCTION public.phones_match(p_a text, p_b text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.update_public_booking_by_client(
  p_booking_id uuid,
  p_phone text,
  p_service_ids uuid[],
  p_professional_id uuid,
  p_appointment_time timestamp with time zone,
  p_original_appointment_time timestamp with time zone,
  p_customer_name text,
  p_customer_phone text,
  p_total_price numeric,
  p_duration_minutes integer,
  p_product_lines jsonb DEFAULT '[]'::jsonb
)
RETURNS SETOF public.public_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.public_bookings pb
  SET
    service_ids = p_service_ids,
    professional_id = p_professional_id,
    appointment_time = p_appointment_time,
    original_appointment_time = p_original_appointment_time,
    updated_at = NOW(),
    customer_name = p_customer_name,
    customer_phone = p_customer_phone,
    total_price = p_total_price,
    status = 'pending',
    duration_minutes = p_duration_minutes,
    is_edit = true,
    product_lines = COALESCE(p_product_lines, '[]'::jsonb)
  WHERE pb.id = p_booking_id
    AND public.phones_match(pb.customer_phone, p_phone)
    AND pb.status IN ('pending', 'confirmed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'update_public_booking_by_client: booking not found or not editable';
  END IF;

  RETURN QUERY
  SELECT pb.* FROM public.public_bookings pb WHERE pb.id = p_booking_id LIMIT 1;
END;
$function$;

REVOKE ALL ON FUNCTION public.update_public_booking_by_client(uuid, text, uuid[], uuid, timestamptz, timestamptz, text, text, numeric, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_public_booking_by_client(uuid, text, uuid[], uuid, timestamptz, timestamptz, text, text, numeric, integer, jsonb) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_client_bookings_history(p_phone text, p_business_id uuid)
RETURNS TABLE(id uuid, appointment_time timestamptz, status text, professional_id uuid, professional_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT pb.id, pb.appointment_time, pb.status::text, pb.professional_id, tm.name
  FROM public.public_bookings pb
  LEFT JOIN public.team_members tm ON tm.id = pb.professional_id
  WHERE pb.customer_phone = p_phone
    AND pb.business_id = p_business_id::text
  ORDER BY pb.appointment_time DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_client_bookings_history(text, uuid) TO anon, authenticated, service_role;

-- Live (md5 e9559c7e) compara team_members.user_id (text) com uuid e ignora bloqueio.
CREATE OR REPLACE FUNCTION public.get_first_available_professional(p_business_id uuid, p_appointment_time timestamp with time zone, p_duration_min integer DEFAULT 30)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pro_id uuid;
  v_end_time timestamp with time zone;
BEGIN
  v_end_time := p_appointment_time + (p_duration_min * interval '1 minute');

  SELECT id INTO v_pro_id
  FROM team_members tm
  WHERE tm.user_id = p_business_id
  AND tm.active = true
  AND NOT EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.professional_id = tm.id
    AND a.status NOT IN ('Cancelled', 'Rejected')
    AND (a.appointment_time, a.appointment_time + (a.duration_minutes * interval '1 minute')) OVERLAPS (p_appointment_time, v_end_time)
  )
  AND NOT EXISTS (
    SELECT 1 FROM public_bookings pb
    WHERE pb.professional_id = tm.id
    AND pb.status = 'pending'
    AND (pb.appointment_time, pb.appointment_time + (pb.duration_minutes * interval '1 minute')) OVERLAPS (p_appointment_time, v_end_time)
  )
  ORDER BY random()
  LIMIT 1;

  RETURN v_pro_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_first_available_professional(uuid, timestamptz, integer) TO PUBLIC, anon, authenticated, service_role;
