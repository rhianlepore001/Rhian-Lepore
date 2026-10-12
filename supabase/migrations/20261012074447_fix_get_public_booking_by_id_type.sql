-- =============================================================================
-- get_public_booking_by_id: corrige o tipo de business_id (text -> uuid)
-- Spec: docs/specs/booking-status-poll-SPEC.md
-- Rollback: docs/rollbacks/20261012074447_fix_get_public_booking_by_id_type.rollback.sql
--
-- ANTES (prod, pg_get_functiondef em 2026-10-11, md5 55be6c3d5c909db060159c59a162da13):
--   RETURNS TABLE(..., business_id uuid, ...) mas o SELECT devolve pb.business_id (text):
--   toda chamada falha com 42804 "structure of query does not match function result
--   type". O polling de 5 s da tela de sucesso do link público (pages/PublicBooking.tsx)
--   nunca atualizava o status ("Pedido enviado" não virava "confirmado").
-- AGORA: mesmo corpo, com pb.business_id::uuid (o WHERE já garante que business_id é o
--   texto canônico do uuid recebido). Mesma assinatura, mesmo retorno, mesma regra de acesso
--   (id + negócio + telefone). CREATE OR REPLACE mantém dono, ACL, SECURITY DEFINER e
--   search_path. Nada mais muda.
-- md5 de pg_get_functiondef depois: 9c4d508e27ecee75d36c33c9d2df70cb aplicando este arquivo
--   com psql (corpo com CRLF, igual a prod); 98f253bcc93a7ff36bf4bf63e70d57da via MCP
--   (apply_migration/execute_sql convertem CRLF em LF). Só muda a quebra de linha.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_public_booking_by_id(p_booking_id uuid, p_business_id uuid, p_phone text)
 RETURNS TABLE(id uuid, customer_name text, customer_phone text, appointment_time timestamp with time zone, service_ids uuid[], status text, business_id uuid, professional_id uuid, total_price numeric, duration_minutes integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    pb.id,
    pb.customer_name,
    pb.customer_phone,
    pb.appointment_time,
    pb.service_ids,
    pb.status,
    pb.business_id::uuid,
    pb.professional_id,
    pb.total_price,
    pb.duration_minutes
  FROM public_bookings pb
  WHERE pb.id = p_booking_id
    AND pb.business_id = p_business_id::text
    AND public.phones_match(pb.customer_phone, p_phone)
  LIMIT 1;
END;
$function$;
