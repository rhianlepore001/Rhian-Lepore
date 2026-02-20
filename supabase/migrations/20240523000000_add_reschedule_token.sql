-- Add reschedule_token to bookings table for secure magic links
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS reschedule_token uuid DEFAULT gen_random_uuid();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_reschedule_token ON public.bookings(reschedule_token);

-- Update business_settings with autonomy toggles
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS enable_email_reminders boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_self_rescheduling boolean DEFAULT true;

-- Create or replace function to get booking by token with security check
CREATE OR REPLACE FUNCTION public.get_booking_by_token(p_booking_id uuid, p_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking json;
BEGIN
    SELECT row_to_json(b) INTO v_booking
    FROM public.bookings b
    JOIN public.business_settings s ON b.business_id = s.user_id
    WHERE b.id = p_booking_id 
      AND b.reschedule_token = p_token
      AND s.enable_self_rescheduling = true -- Securely check if professional allows rescheduling
    LIMIT 1;

    RETURN v_booking;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_by_token TO anon, authenticated, service_role;
