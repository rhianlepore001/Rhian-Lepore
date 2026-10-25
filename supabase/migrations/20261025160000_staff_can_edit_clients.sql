BEGIN;

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS staff_can_edit_clients boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.staff_can_edit_clients(p_company text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND p_company = public.get_auth_company_id()
    AND coalesce((SELECT bs.staff_can_edit_clients FROM public.business_settings bs
                  WHERE bs.user_id = p_company), false)
$$;
REVOKE ALL ON FUNCTION public.staff_can_edit_clients(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_can_edit_clients(text) TO authenticated;

DROP POLICY IF EXISTS "Staff can update company clients" ON public.clients;
CREATE POLICY "Staff can update company clients" ON public.clients
FOR UPDATE TO authenticated
USING (
  public.get_auth_role() = 'staff'
  AND user_id = public.get_auth_company_id()
  AND public.staff_can_edit_clients(public.get_auth_company_id())
)
WITH CHECK (
  public.get_auth_role() = 'staff'
  AND user_id = public.get_auth_company_id()
  AND public.staff_can_edit_clients(public.get_auth_company_id())
);

CREATE OR REPLACE FUNCTION public.clients_staff_column_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
BEGIN
  IF public.get_auth_role() = 'staff' AND (
    NEW.id IS DISTINCT FROM OLD.id OR
    NEW.user_id IS DISTINCT FROM OLD.user_id OR
    NEW.created_at IS DISTINCT FROM OLD.created_at OR
    NEW.loyalty_tier IS DISTINCT FROM OLD.loyalty_tier OR
    NEW.total_visits IS DISTINCT FROM OLD.total_visits OR
    NEW.last_visit IS DISTINCT FROM OLD.last_visit OR
    NEW.next_prediction IS DISTINCT FROM OLD.next_prediction OR
    NEW.rating IS DISTINCT FROM OLD.rating OR
    NEW.source IS DISTINCT FROM OLD.source OR
    NEW.is_active IS DISTINCT FROM OLD.is_active
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'staff_client_edit_forbidden';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.clients_staff_column_guard() FROM PUBLIC, anon;
DROP TRIGGER IF EXISTS clients_staff_column_guard ON public.clients;
CREATE TRIGGER clients_staff_column_guard BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.clients_staff_column_guard();

COMMIT;
