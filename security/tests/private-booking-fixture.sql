ALTER TABLE public.public_clients ALTER COLUMN business_id TYPE text USING business_id::text;
ALTER TABLE public.public_clients ALTER COLUMN name TYPE varchar;
ALTER TABLE public.public_clients ALTER COLUMN phone TYPE varchar;
ALTER TABLE public.public_clients ADD COLUMN email varchar;
ALTER TABLE public.public_clients ADD COLUMN last_booking_at timestamptz;
ALTER TABLE public.public_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ADD COLUMN source text;
CREATE UNIQUE INDEX clients_tenant_phone_sec02 ON public.clients(user_id,phone);
CREATE OR REPLACE FUNCTION public.business_exists(p_business_id text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_business_id)
$$;
CREATE TABLE public.queue_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),business_id text,client_phone text,status text,joined_at timestamptz);
