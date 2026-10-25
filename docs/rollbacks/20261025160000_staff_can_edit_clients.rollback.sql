BEGIN;
DROP TRIGGER IF EXISTS clients_staff_column_guard ON public.clients;
DROP FUNCTION IF EXISTS public.clients_staff_column_guard();
DROP POLICY IF EXISTS "Staff can update company clients" ON public.clients;
DROP FUNCTION IF EXISTS public.staff_can_edit_clients(text);
ALTER TABLE public.business_settings DROP COLUMN IF EXISTS staff_can_edit_clients;
COMMIT;
