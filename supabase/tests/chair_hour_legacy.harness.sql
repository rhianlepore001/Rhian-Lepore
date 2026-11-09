-- Esquema descartável para executar as definições reais versionadas de checkout e fila.
ALTER TABLE public.business_settings ADD COLUMN business_hours jsonb, ADD COLUMN machine_fee_enabled boolean DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN received_by uuid, ADD COLUMN completed_by uuid, ADD COLUMN machine_fee_percent numeric DEFAULT 0,
 ADD COLUMN machine_fee_amount numeric DEFAULT 0, ADD COLUMN machine_fee_applied boolean DEFAULT false, ADD COLUMN updated_at timestamptz DEFAULT now();
ALTER TABLE public.finance_records ADD COLUMN commission_base numeric, ADD COLUMN machine_fee_amount numeric DEFAULT 0,
 ADD COLUMN payment_method text, ADD COLUMN client_name text, ADD COLUMN service_name text;
CREATE TABLE public.clients (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text, name text, phone text, created_at timestamptz DEFAULT now());
CREATE TABLE public.services (id uuid PRIMARY KEY, user_id text NOT NULL, name text NOT NULL, duration_minutes integer, price numeric);
CREATE TABLE public.agenda_blocks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, professional_id uuid NOT NULL, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL);
CREATE TABLE public.queue_entries (id uuid PRIMARY KEY, business_id uuid NOT NULL, status text, ticket_status text,
 settled_appointment_id uuid, duration_minutes integer, service_id uuid, service_price_cents integer, professional_id uuid,
 payment_status text, payment_method text, client_phone text, client_name text, closed_at timestamptz, closed_by uuid);
CREATE FUNCTION public.queue_tenant_id() RETURNS text LANGUAGE sql STABLE AS $$ SELECT public.get_auth_company_id() $$;
CREATE FUNCTION public.normalize_phone_digits(text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT regexp_replace($1, '[^0-9]', '', 'g') $$;
