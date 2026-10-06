-- Espelho de produção para public.notifications (lido em 2026-10-06, read-only).
-- Carregar DEPOIS das migrations que criam/alteram notifications (PR-7 e/ou
-- commission_schedules). Os harnesses antigos criavam a tabela SEM o CHECK de
-- type, SEM NOT NULL em title/message e SEM a FK para profiles — por isso os
-- testes passavam enquanto em prod todo INSERT de 'new'/'edit'/'commission_reminder'
-- falhava. Postgres descartável. Não toca produção.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS link text,
  ADD COLUMN IF NOT EXISTS booking_id uuid,
  ADD COLUMN IF NOT EXISTS event_key text;

-- Colunas como em prod (information_schema.columns)
ALTER TABLE public.notifications
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN message SET NOT NULL,
  ALTER COLUMN type SET DEFAULT 'info'::text;

-- Constraints de prod (pg_get_constraintdef), verbatim
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK ((type = ANY (ARRAY['info'::text, 'warning'::text, 'success'::text, 'danger'::text])));
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_unread_event_key_uid_idx
  ON public.notifications (user_id, event_key)
  WHERE read = false AND event_key IS NOT NULL;

-- RLS e grants de prod (pg_policy / role_table_grants / role_column_grants)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can select own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can select own notifications"
  ON public.notifications FOR SELECT
  USING ((auth.uid())::text = user_id);
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING ((auth.uid())::text = user_id)
  WITH CHECK ((auth.uid())::text = user_id);
REVOKE ALL ON TABLE public.notifications FROM anon, authenticated;
GRANT SELECT ON TABLE public.notifications TO authenticated;
GRANT UPDATE (read) ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;
