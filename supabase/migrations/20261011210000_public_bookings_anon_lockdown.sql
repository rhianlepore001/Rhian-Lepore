-- =============================================================================
-- public_bookings: fecha a leitura e o INSERT direto por anon
-- Spec: docs/specs/public-bookings-security-SPEC.md
-- Rollback: docs/rollbacks/20261011210000_public_bookings_anon_lockdown.rollback.sql
--
-- ANTES (prod, lido em 2026-10-11):
--   public_bookings_select_anon_fresh  SELECT TO anon
--     USING (status = 'pending' AND created_at IS NOT NULL AND created_at > now() - '00:02:00')
--     -> qualquer visitante lista os pedidos pendentes dos últimos 2 min de TODOS os
--        negócios (nome, telefone, horário, serviços).
--   public_bookings_insert_anon        INSERT TO anon, authenticated
--     WITH CHECK (business_id válido AND business_exists(business_id) AND status pending)
--     -> INSERT direto pula create_public_booking (horário ocupado, profissional do
--        negócio, serviços, preço, modo automático).
--   ACL: anon = arwdDxtm (tudo).
--
-- AGORA:
--   1. DROP das duas policies acima. As outras 3 (dono/empresa, só authenticated) ficam.
--   2. REVOKE de anon: INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN.
--      SELECT continua concedido (sem policy de anon = 0 linhas) para não mudar o
--      comportamento do canal realtime antigo da tela de sucesso (que já não recebia
--      nada útil: a policy só valia para pending < 2 min).
--
-- O fluxo público usa só RPCs SECURITY DEFINER (create_public_booking,
-- get_active_booking_by_phone, get_booking_by_id_v2, get_client_bookings_history_v2,
-- cancel/update_public_booking_by_client_v2, ...), donas de postgres, que não passam por
-- RLS: nada muda para elas. Dono/staff continuam pelas policies authenticated.
-- Nenhuma função, trigger, coluna ou dado é alterado.
-- =============================================================================

DROP POLICY IF EXISTS public_bookings_select_anon_fresh ON public.public_bookings;
DROP POLICY IF EXISTS public_bookings_insert_anon ON public.public_bookings;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLE public.public_bookings FROM anon;
