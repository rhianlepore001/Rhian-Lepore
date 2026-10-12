-- =============================================================================
-- ROLLBACK de 20261012074447_fix_get_public_booking_by_id_type
-- Volta byte a byte ao corpo de prod de 2026-10-11 (md5 55be6c3d5c909db060159c59a162da13),
-- que falha em toda chamada (bug original). Idempotente; mantém ACL.
-- Aplicado via MCP (execute_sql), o CRLF do corpo vira LF: md5 92c572ae72cd3550abb31191130332ab
--   (mesmo corpo de 55be6c3d..., só a quebra de linha muda). Com psql + este arquivo: 55be6c3d...
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
    pb.business_id,
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
