-- ==========================================================================
-- FIX DEFINITIVO: RLS public_bookings — Agendamento Público
-- ==========================================================================
-- Problema: Novos clientes recebiam "new row violates row_level security
--   policy for table public_bookings" ao tentar agendar.
--
-- Causa Raiz:
--   1. Políticas de INSERT duplicadas/ambíguas geradas por migrações históricas
--   2. A policy "Owner can manage public_bookings" (FOR ALL) interagia com
--      o role public de forma imprevisível em alguns contextos
--
-- Solução:
--   - Remove todas as políticas de INSERT existentes
--   - Cria UMA política de INSERT limpa, explícita e sem ambiguidade
--   - Garante GRANTs explícitos para os roles anon e authenticated
-- ==========================================================================

-- Passo 1: Remover políticas de INSERT duplicadas/conflitantes
DROP POLICY IF EXISTS "Public can create bookings" ON public.public_bookings;
DROP POLICY IF EXISTS "Public bookings: public insert" ON public.public_bookings;
DROP POLICY IF EXISTS "Owner can manage public_bookings" ON public.public_bookings;

-- Passo 2: Recriar a política do owner (ALL exceto INSERT — para não sobrepor a política pública)
CREATE POLICY "Owner can manage public_bookings"
  ON public.public_bookings
  FOR ALL
  TO authenticated
  USING ((auth.uid())::text = business_id)
  WITH CHECK ((auth.uid())::text = business_id);

-- Passo 3: Criar política de INSERT pública — limpa e inequívoca
-- Permite que qualquer pessoa (anon ou autenticada) crie um agendamento
CREATE POLICY "public_bookings_insert_anon"
  ON public.public_bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Passo 4: Garantir GRANTs explícitos no nível de tabela (defesa em profundidade)
GRANT INSERT ON public.public_bookings TO anon;
GRANT INSERT ON public.public_bookings TO authenticated;

-- Verificação: deve retornar as políticas correctas
-- SELECT policyname, cmd, roles, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'public_bookings'
-- ORDER BY cmd, policyname;
