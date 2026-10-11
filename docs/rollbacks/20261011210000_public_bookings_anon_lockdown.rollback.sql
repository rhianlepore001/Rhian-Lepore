-- =============================================================================
-- ROLLBACK de 20261011210000_public_bookings_anon_lockdown
-- Volta exatamente ao estado de prod de 2026-10-11 (policies e ACL de anon).
-- Idempotente. Não toca em dados.
-- =============================================================================

GRANT INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLE public.public_bookings TO anon;

DROP POLICY IF EXISTS public_bookings_insert_anon ON public.public_bookings;
CREATE POLICY public_bookings_insert_anon
  ON public.public_bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    business_id IS NOT NULL
    AND btrim(business_id) <> ''
    AND public.business_exists(business_id)
    AND COALESCE(status, 'pending') = 'pending'
  );

DROP POLICY IF EXISTS public_bookings_select_anon_fresh ON public.public_bookings;
CREATE POLICY public_bookings_select_anon_fresh
  ON public.public_bookings
  FOR SELECT
  TO anon
  USING (
    status = 'pending'
    AND created_at IS NOT NULL
    AND created_at > now() - interval '2 minutes'
  );
