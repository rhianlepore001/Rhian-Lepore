-- Agenda v2: coluna dedicada para o badge "Editado"
-- Setada SOMENTE pelo fluxo de edição real (AppointmentEditModal).
-- Não usar updated_at: o trigger update_appointments_updated_at dispara em
-- qualquer UPDATE (concluir/cancelar/no-show), tornando updated_at > created_at inútil.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;

-- Documentar os valores válidos de status (TEXT livre, sem CHECK).
-- Agenda v2 adiciona 'NoShow' (não compareceu) à UI.
COMMENT ON COLUMN public.appointments.status IS
  'Valores: Pending, Confirmed, Completed, Cancelled, NoShow';
