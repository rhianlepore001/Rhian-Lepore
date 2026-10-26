BEGIN;

CREATE TABLE public.whatsapp_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_key text NOT NULL CHECK (message_key IN (
    'booking_accepted', 'booking_confirmed', 'wizard_confirm', 'reschedule',
    'reactivation', 'rebooking', 'queue_joined', 'membership_contact',
    'client_request_confirm', 'client_change', 'client_question', 'client_cancel',
    'membership_overdue', 'membership_pending'
  )),
  enabled boolean NOT NULL DEFAULT true,
  body text CHECK (body IS NULL OR char_length(body) BETWEEN 1 AND 1000),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, message_key)
);

ALTER TABLE public.whatsapp_message_templates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_message_templates FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_message_templates TO authenticated;

CREATE POLICY "Templates: tenant read" ON public.whatsapp_message_templates
  FOR SELECT TO authenticated
  USING (business_id = (SELECT public.get_auth_company_id())
    AND (SELECT public.get_auth_role()) IN ('owner', 'staff'));

CREATE POLICY "Templates: owner insert" ON public.whatsapp_message_templates
  FOR INSERT TO authenticated
  WITH CHECK (business_id = (SELECT public.get_auth_company_id())
    AND (SELECT public.get_auth_role()) = 'owner');

CREATE POLICY "Templates: owner update" ON public.whatsapp_message_templates
  FOR UPDATE TO authenticated
  USING (business_id = (SELECT public.get_auth_company_id())
    AND (SELECT public.get_auth_role()) = 'owner')
  WITH CHECK (business_id = (SELECT public.get_auth_company_id())
    AND (SELECT public.get_auth_role()) = 'owner');

CREATE POLICY "Templates: owner delete" ON public.whatsapp_message_templates
  FOR DELETE TO authenticated
  USING (business_id = (SELECT public.get_auth_company_id())
    AND (SELECT public.get_auth_role()) = 'owner');

CREATE FUNCTION public.stamp_whatsapp_message_template()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.stamp_whatsapp_message_template() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER stamp_whatsapp_message_template
  BEFORE INSERT OR UPDATE ON public.whatsapp_message_templates
  FOR EACH ROW EXECUTE FUNCTION public.stamp_whatsapp_message_template();

CREATE FUNCTION public.get_public_whatsapp_templates(p_slug text)
RETURNS TABLE (message_key text, enabled boolean, body text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT t.message_key, t.enabled, t.body
  FROM public.whatsapp_message_templates t
  JOIN public.profiles p ON p.id = t.business_id
  WHERE p.business_slug = p_slug
    AND p.role = 'owner'
    AND t.message_key IN (
      'client_request_confirm', 'client_change', 'client_question', 'client_cancel',
      'membership_overdue', 'membership_pending'
    );
$$;
REVOKE ALL ON FUNCTION public.get_public_whatsapp_templates(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_whatsapp_templates(text) TO anon, authenticated;

COMMIT;
