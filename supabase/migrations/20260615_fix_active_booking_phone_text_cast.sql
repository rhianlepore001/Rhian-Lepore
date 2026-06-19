-- Fix: public_bookings.business_id is TEXT, RPC params are UUID.
-- Without ::text cast Postgres raises: operator does not exist: text = uuid

DROP FUNCTION IF EXISTS get_active_booking_by_phone(TEXT, UUID);

CREATE OR REPLACE FUNCTION get_active_booking_by_phone(
  p_phone TEXT,
  p_business_id UUID
)
RETURNS TABLE (
  id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  appointment_time TIMESTAMPTZ,
  service_ids UUID[],
  status TEXT,
  business_id TEXT,
  professional_id UUID,
  total_price NUMERIC,
  duration_minutes INTEGER
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
  WHERE pb.business_id = p_business_id::text
    AND public.phones_match(pb.customer_phone, p_phone)
    AND pb.status = 'pending'
    AND pb.appointment_time > NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_booking_by_phone(TEXT, UUID) TO anon, authenticated;
