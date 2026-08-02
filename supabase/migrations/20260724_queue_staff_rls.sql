-- ========================================
-- F4: libera fila digital pra staff
-- 2026-07-24
-- ========================================
-- Adiciona policies de SELECT e UPDATE em queue_entries
-- para staff autenticado e vinculado a um team_member ativo
-- do mesmo tenant (business_id = team_members.user_id).
--
-- Staff PODE:
--   - SELECT (ver fila inteira)
--   - UPDATE (puxar, finalizar, cancelar)
-- Staff NÃO pode:
--   - INSERT (adicionar cliente manual — escopo F4)
--   - DELETE (remover entry — escopo F4)
--   - Mudar business_id (WITH CHECK protege)
--
-- queue_entries.business_id é UUID e team_members.user_id é TEXT: sem os casts
-- o Postgres aborta com "operator does not exist: uuid = text".

-- 1. Staff pode LER queue_entries do tenant
DROP POLICY IF EXISTS "Staff can view company queue" ON public.queue_entries;
CREATE POLICY "Staff can view company queue"
  ON public.queue_entries
  FOR SELECT
  TO authenticated
  USING (
    business_id::TEXT IN (
      SELECT tm.user_id::TEXT FROM public.team_members tm
      WHERE tm.staff_user_id = auth.uid()
        AND tm.active = true
    )
  );

-- 2. Staff pode ATUALIZAR queue_entries do tenant
--    - USING: garante que staff só mexe em entries do próprio tenant
--    - WITH CHECK: garante que staff NÃO muda business_id (proteção contra leak)
DROP POLICY IF EXISTS "Staff can update company queue" ON public.queue_entries;
CREATE POLICY "Staff can update company queue"
  ON public.queue_entries
  FOR UPDATE
  TO authenticated
  USING (
    business_id::TEXT IN (
      SELECT tm.user_id::TEXT FROM public.team_members tm
      WHERE tm.staff_user_id = auth.uid()
        AND tm.active = true
    )
  )
  WITH CHECK (
    business_id::TEXT IN (
      SELECT tm.user_id::TEXT FROM public.team_members tm
      WHERE tm.staff_user_id = auth.uid()
        AND tm.active = true
    )
  );

-- Sem policy de INSERT ou DELETE: staff não adiciona manual nem deleta.
-- Política pública "Public can join queue" continua liberando INSERT via /queue/:slug
-- (rota pública, sem auth).
