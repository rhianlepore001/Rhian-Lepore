-- Extras do harness PR-5. Carregar DEPOIS de booking_completed_noshow.harness
-- + migration #123. Postgres descartável. Não toca produção.

CREATE TABLE IF NOT EXISTS public.business_settings (
  user_id text PRIMARY KEY REFERENCES public.profiles(id),
  cancellation_policy text DEFAULT 'flexible',
  enable_self_rescheduling boolean DEFAULT true,
  public_products_enabled boolean DEFAULT false,
  business_hours jsonb,
  queue_mode text,
  queue_allow_leave boolean,
  queue_late_minutes integer
);

CREATE OR REPLACE FUNCTION public.business_timezone(p_business_id text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT 'UTC'::text
$$;

CREATE OR REPLACE FUNCTION public.get_public_business_settings_json(p_business_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    'queue_late_minutes', bs.queue_late_minutes,
    'timezone', public.business_timezone(p_business_id::text)
  )
  INTO v_result
  FROM public.business_settings bs
  WHERE bs.user_id::text = p_business_id::text
  LIMIT 1;

  RETURN v_result;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_public_business_settings_json(uuid) TO anon, authenticated, service_role;

-- v1 intacta (prod-equivalent). Identidade via phones_match; sem cutoff.
CREATE OR REPLACE FUNCTION public.cancel_public_booking_by_client(
  p_booking_id UUID,
  p_phone TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INT;
BEGIN
  IF btrim(COALESCE(p_phone, '')) = '' THEN
    RAISE EXCEPTION 'booking_not_cancellable';
  END IF;

  UPDATE public.public_bookings pb
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE pb.id = p_booking_id
    AND public.phones_match(pb.customer_phone, p_phone)
    AND pb.status IN ('pending', 'confirmed');

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'booking_not_cancellable';
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_public_booking_by_client(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_public_booking_by_client(UUID, TEXT) TO anon, authenticated;

-- Slot ocupado se houver appointment não Cancelled/NoShow no mesmo instante.
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_business_id uuid,
  p_date date,
  p_professional_id uuid DEFAULT NULL,
  p_duration_min integer DEFAULT 30,
  p_is_professional boolean DEFAULT false
)
RETURNS TABLE(slot_time timestamptz)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT gs::timestamptz
  FROM generate_series(
    p_date::timestamp,
    p_date::timestamp + interval '23 hours 30 minutes',
    interval '30 minutes'
  ) AS gs
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.user_id = p_business_id::text
      AND a.appointment_time = gs::timestamptz
      AND a.status IS DISTINCT FROM 'Cancelled'
      AND a.status IS DISTINCT FROM 'NoShow'
      AND (p_professional_id IS NULL OR a.professional_id = p_professional_id)
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid, date, uuid, integer, boolean) TO anon, authenticated, service_role;

INSERT INTO public.business_settings (user_id, cancellation_policy)
VALUES ('00000000-0000-0000-0000-0000000000a0', 'flexible')
ON CONFLICT (user_id) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_settings TO anon, authenticated, service_role;
