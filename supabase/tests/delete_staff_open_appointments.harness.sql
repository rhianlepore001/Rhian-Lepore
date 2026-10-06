-- Harness para testar a guarda de atendimento em aberto em delete_staff_collaborator.
-- Carregar DEPOIS de staff_purge_auth_user.harness.sql + 20261006071036 (estado de prod).
-- Copia de prod (information_schema / pg_constraint, 2026-10-06) só o que importa:
--   clients.user_id e appointments.user_id text -> profiles(id) ON UPDATE CASCADE
--   (NO ACTION no delete: é o que gera o 23503 legado ao apagar o profile do staff);
--   appointments.professional_id -> team_members(id); status text NOT NULL (sem CHECK);
--   origin agenda|queue|booking. Postgres descartável. Não toca prod.

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text REFERENCES public.profiles(id) ON UPDATE CASCADE,
  name text NOT NULL
);
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text REFERENCES public.profiles(id) ON UPDATE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service text NOT NULL,
  appointment_time timestamptz NOT NULL,
  status text NOT NULL,
  professional_id uuid REFERENCES public.team_members(id),
  duration_minutes integer,
  origin text NOT NULL DEFAULT 'agenda' CHECK (origin = ANY (ARRAY['agenda'::text, 'queue'::text, 'booking'::text]))
);
GRANT SELECT ON public.clients, public.appointments TO authenticated;
