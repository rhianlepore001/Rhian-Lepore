-- Extras do PR-2 (coluna já existe em prod; o harness do follow-up não a tem).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS booking_lead_time_hours integer DEFAULT 2;

UPDATE public.profiles
SET booking_lead_time_hours = 2
WHERE id = '00000000-0000-0000-0000-00000000000a';

INSERT INTO public.profiles (id, role, company_id, region, booking_lead_time_hours)
VALUES ('00000000-0000-0000-0000-00000000000b', 'staff', '00000000-0000-0000-0000-00000000000a', 'PT', 2)
ON CONFLICT (id) DO UPDATE SET
  role = 'staff',
  company_id = '00000000-0000-0000-0000-00000000000a',
  booking_lead_time_hours = 2;

INSERT INTO public.business_settings (user_id, timezone, business_hours)
VALUES (
  '00000000-0000-0000-0000-00000000000a',
  'Europe/Lisbon',
  jsonb_build_object(
    'sun', jsonb_build_object('isOpen', true, 'blocks', jsonb_build_array(jsonb_build_object('start', '09:00', 'end', '20:00'))),
    'mon', jsonb_build_object('isOpen', true, 'blocks', jsonb_build_array(jsonb_build_object('start', '09:00', 'end', '20:00'))),
    'tue', jsonb_build_object('isOpen', true, 'blocks', jsonb_build_array(jsonb_build_object('start', '09:00', 'end', '20:00'))),
    'wed', jsonb_build_object('isOpen', true, 'blocks', jsonb_build_array(jsonb_build_object('start', '09:00', 'end', '20:00'))),
    'thu', jsonb_build_object('isOpen', true, 'blocks', jsonb_build_array(jsonb_build_object('start', '09:00', 'end', '20:00'))),
    'fri', jsonb_build_object('isOpen', true, 'blocks', jsonb_build_array(jsonb_build_object('start', '09:00', 'end', '20:00'))),
    'sat', jsonb_build_object('isOpen', true, 'blocks', jsonb_build_array(jsonb_build_object('start', '09:00', 'end', '20:00')))
  )
)
ON CONFLICT (user_id) DO UPDATE SET
  timezone = EXCLUDED.timezone,
  business_hours = EXCLUDED.business_hours;

GRANT INSERT, UPDATE ON public.public_bookings TO anon;
GRANT EXECUTE ON FUNCTION public.create_secure_booking(uuid, uuid, text, text, text, timestamptz, text[], numeric, integer, text, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_company_id() TO authenticated, service_role;
