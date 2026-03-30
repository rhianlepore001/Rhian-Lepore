-- ==========================================================================
-- FIX REAL: Política SELECT para anon em public_bookings
-- ==========================================================================
-- Problema: INSERT com .select() do Supabase JS Client (v2+) executa
-- internamente um RETURNING que exige política SELECT para o role anon.
-- Sem essa policy, o Supabase retorna RLS violation mesmo com INSERT
-- perfeitamente permitido via public_bookings_insert_anon.
-- ==========================================================================

DROP POLICY IF EXISTS "public_bookings_select_anon" ON public.public_bookings;

-- Permite que usuário anônimo leia bookings (necessário para INSERT...select())
CREATE POLICY "public_bookings_select_anon"
  ON public.public_bookings
  FOR SELECT
  TO anon
  USING (true);
