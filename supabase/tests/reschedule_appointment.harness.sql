-- Extras para remarcar. Empilha em cima de noshow + agenda_blocks + follow-up.
-- Não redefine funções existentes (md5 de create_secure_booking /
-- enforce_staff_appointment_edit_scope / enforce_agenda_block_on_appointments
-- precisa permanecer idêntico depois da migration de remarcação).

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

ALTER TABLE public.public_bookings
  ADD COLUMN IF NOT EXISTS original_appointment_time timestamptz;

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS is_owner boolean DEFAULT false;
