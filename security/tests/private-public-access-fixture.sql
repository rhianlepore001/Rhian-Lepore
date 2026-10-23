CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_slug text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.queue_entries
 ADD COLUMN client_id uuid, ADD COLUMN client_name text, ADD COLUMN service_id uuid,
 ADD COLUMN professional_id uuid, ADD COLUMN called_at timestamptz,
 ADD COLUMN serving_at timestamptz, ADD COLUMN duration_minutes integer,
 ADD COLUMN service_price_cents integer, ADD COLUMN payment_method text,
 ADD COLUMN payment_status text DEFAULT 'unpaid';
ALTER TABLE public.queue_entries ALTER COLUMN joined_at SET DEFAULT now();
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS queue_mode text DEFAULT 'shared',
 ADD COLUMN IF NOT EXISTS queue_allow_leave boolean DEFAULT true, ADD COLUMN IF NOT EXISTS queue_late_minutes integer DEFAULT 10;
CREATE TABLE public.queue_payments(id uuid DEFAULT gen_random_uuid(),business_id text,queue_entry_id uuid,method text,amount_cents integer,br_code text,txid text,mbway_phone text,expires_at timestamptz);
CREATE UNIQUE INDEX queue_test_active_phone ON public.queue_entries(business_id,client_phone) WHERE status IN ('waiting','calling','serving');
CREATE OR REPLACE FUNCTION public.normalize_phone_digits(text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT regexp_replace($1,'\D','','g') $$;
