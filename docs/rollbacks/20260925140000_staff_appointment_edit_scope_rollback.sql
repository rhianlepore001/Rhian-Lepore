-- =============================================================================
-- ROLLBACK de 20260925140000_staff_appointment_edit_scope
-- =============================================================================
-- A migration é só aditiva: não altera nenhuma policy nem função existente.
-- Voltar ao estado atual de prod = remover os 4 objetos novos, na ordem abaixo.
-- Nenhuma linha de appointments é tocada. A coluna removida só guarda a
-- escolha do dono (perde-se a escolha; o comportamento volta ao de hoje).
--
-- Estado de prod lido em 2026-09-25 (pg_policies / pg_trigger), que continua
-- válido após este rollback porque a migration não o modifica:
--
--   appointments (triggers não internos):
--     update_appointments_updated_at  BEFORE UPDATE  EXECUTE FUNCTION update_updated_at_column()
--
--   appointments (policies):
--     "Appointments: company isolation"            ALL     {authenticated}  USING (user_id = get_auth_company_id())  WITH CHECK (user_id = get_auth_company_id())
--     "Users can manage their own appointments"    ALL     {public}         USING (user_id = (auth.uid())::text)
--     "Staff insert company appointments"          INSERT  {authenticated}  WITH CHECK (user_id = get_auth_company_id())
--     "Staff can read company appointments"        SELECT  {public}         USING ((user_id = (auth.uid())::text) OR (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (auth.uid())::text AND profiles.role = 'staff'::text AND profiles.company_id = appointments.user_id)))
--     "Users can only see their own appointments"  SELECT  {public}         USING (user_id = (auth.uid())::text)
--
--   business_settings (policies):
--     "Owner can manage business_settings"  ALL     {public}         USING ((auth.uid())::text = user_id)  WITH CHECK ((auth.uid())::text = user_id)
--     "Settings: company read"              SELECT  {authenticated}  USING (user_id = get_auth_company_id())
--     "Settings: owner update"              UPDATE  {authenticated}  USING ((user_id = get_auth_company_id()) AND (get_auth_role() = 'owner'::text))  WITH CHECK (same)
-- =============================================================================

BEGIN;

DROP TRIGGER IF EXISTS enforce_staff_appointment_edit_scope ON public.appointments;

DROP FUNCTION IF EXISTS public.enforce_staff_appointment_edit_scope();

DROP FUNCTION IF EXISTS public.staff_can_modify_appointment(text, uuid, uuid);

ALTER TABLE public.business_settings
  DROP CONSTRAINT IF EXISTS business_settings_staff_appointment_edit_scope_check;

ALTER TABLE public.business_settings
  DROP COLUMN IF EXISTS staff_appointment_edit_scope;

COMMIT;

-- Verificação pós-rollback (esperado: 0 linhas em cada):
--   SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.appointments'::regclass AND tgname = 'enforce_staff_appointment_edit_scope';
--   SELECT proname FROM pg_proc WHERE proname IN ('enforce_staff_appointment_edit_scope', 'staff_can_modify_appointment');
--   SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'business_settings' AND column_name = 'staff_appointment_edit_scope';
