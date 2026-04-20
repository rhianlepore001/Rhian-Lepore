-- Migration: Staff pode ler dados da empresa
-- Permite que colaboradores (role=staff) acessem dados da empresa via profiles.company_id
-- Nota: profiles.id e *.user_id são TEXT, por isso auth.uid()::text é necessário

-- appointments
DROP POLICY IF EXISTS "Staff can read company appointments" ON public.appointments;
CREATE POLICY "Staff can read company appointments"
  ON public.appointments FOR SELECT
  USING (
    user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()::text
        AND role = 'staff'
        AND company_id = appointments.user_id
    )
  );

-- clients
DROP POLICY IF EXISTS "Staff can read company clients" ON public.clients;
CREATE POLICY "Staff can read company clients"
  ON public.clients FOR SELECT
  USING (
    user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()::text
        AND role = 'staff'
        AND company_id = clients.user_id
    )
  );

-- services
DROP POLICY IF EXISTS "Staff can read company services" ON public.services;
CREATE POLICY "Staff can read company services"
  ON public.services FOR SELECT
  USING (
    user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()::text
        AND role = 'staff'
        AND company_id = services.user_id
    )
  );

-- team_members (staff_user_id é UUID, sem cast)
DROP POLICY IF EXISTS "Staff can read company team members" ON public.team_members;
CREATE POLICY "Staff can read company team members"
  ON public.team_members FOR SELECT
  USING (
    user_id = auth.uid()::text
    OR staff_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()::text
        AND role = 'staff'
        AND company_id = team_members.user_id
    )
  );
