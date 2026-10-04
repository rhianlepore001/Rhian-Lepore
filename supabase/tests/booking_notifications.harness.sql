-- Extras do harness PR-7. Carregar DEPOIS de PR-6 (edit request).
-- Replica a tabela public.notifications de produção (sem as colunas novas)
-- e o staff X/Y/inativo. Postgres descartável. Não toca produção.

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text,
  message text,
  type text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR ALL
  USING (auth.uid()::text = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO anon, authenticated, service_role;

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS staff_appointment_edit_scope text NOT NULL DEFAULT 'none';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS booking_lead_time_hours integer DEFAULT 2;

UPDATE public.profiles
   SET booking_lead_time_hours = 0
 WHERE id = '00000000-0000-0000-0000-0000000000a0';

UPDATE public.business_settings
   SET timezone = 'America/Sao_Paulo',
       staff_appointment_edit_scope = 'none'
 WHERE user_id = '00000000-0000-0000-0000-0000000000a0';

CREATE OR REPLACE FUNCTION public.business_timezone(p_business_id text)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_tz text;
BEGIN
  SELECT NULLIF(trim(bs.timezone), '')
    INTO v_tz
    FROM public.business_settings bs
   WHERE bs.user_id = p_business_id
   LIMIT 1;
  IF v_tz IS NULL THEN
    RETURN 'America/Sao_Paulo';
  END IF;
  BEGIN
    PERFORM timezone(v_tz, now());
    RETURN v_tz;
  EXCEPTION WHEN OTHERS THEN
    RETURN 'America/Sao_Paulo';
  END;
END;
$$;

INSERT INTO public.profiles (id, role, company_id) VALUES
  ('00000000-0000-0000-0000-0000000000b1', 'staff', '00000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-0000000000b2', 'staff', '00000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-0000000000b3', 'staff', '00000000-0000-0000-0000-0000000000a0')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, company_id = EXCLUDED.company_id;

UPDATE public.team_members
   SET staff_user_id = '00000000-0000-0000-0000-0000000000b1',
       active = true,
       deleted_at = NULL,
       name = 'Aline'
 WHERE id = '10000000-0000-0000-0000-0000000000a1';

INSERT INTO public.team_members (id, user_id, name, is_owner, active, staff_user_id, deleted_at)
VALUES (
  '10000000-0000-0000-0000-0000000000a2',
  '00000000-0000-0000-0000-0000000000a0',
  'Yago', false, true, '00000000-0000-0000-0000-0000000000b2', NULL
)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      active = true,
      deleted_at = NULL,
      staff_user_id = EXCLUDED.staff_user_id;

INSERT INTO public.team_members (id, user_id, name, is_owner, active, staff_user_id, deleted_at)
VALUES (
  '10000000-0000-0000-0000-0000000000a3',
  '00000000-0000-0000-0000-0000000000a0',
  'Inativo', false, false, '00000000-0000-0000-0000-0000000000b3', NULL
)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      active = false,
      deleted_at = NULL,
      staff_user_id = EXCLUDED.staff_user_id;
