-- Aniversário opcional do cliente (CRM v2) — lembrete UI nos próximos 7 dias
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS birth_date DATE;

COMMENT ON COLUMN public.clients.birth_date IS 'Data de nascimento do cliente (opcional). Usada para lembrete de aniversário no CRM.';
