-- Function to find a client by phone number, normalizing both stored and input phones
CREATE OR REPLACE FUNCTION find_client_by_phone_normalized(
  p_user_id UUID,
  p_phone TEXT
) RETURNS TABLE (
  id UUID,
  photo_url TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.photo_url
  FROM clients c
  WHERE c.user_id = p_user_id
  AND regexp_replace(c.phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g');
END;
$$;

-- Function to check for active bookings (REPLACING or CREATING checks)
-- This logic assumes we want to BLOCK valid 'pending' requests but maybe allow confirmed?
-- Or let's see what the current one does. If it doesn't exist I'll create it.
-- Based on user request: "cliente não consegue marcar denovo depois".
-- New Rule: Return active booking ONLY if it is 'pending'. 
-- If 'confirmed', we don't return it here so the UI doesn't block the user.
CREATE OR REPLACE FUNCTION get_active_booking_by_phone(
  p_phone TEXT,
  p_business_id UUID
) RETURNS TABLE (
  id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  appointment_time TIMESTAMPTZ,
  service_ids TEXT[],
  status TEXT,
  business_id UUID,
  professional_id UUID
) LANGUAGE plpgsql SECURITY DEFINER AS $$
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
    pb.professional_id
  FROM public_bookings pb
  WHERE pb.business_id = p_business_id
  AND regexp_replace(pb.customer_phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')
  AND pb.status = 'pending' -- Only block if PENDING
  AND pb.appointment_time > NOW(); -- Only future bookings
END;
$$;
