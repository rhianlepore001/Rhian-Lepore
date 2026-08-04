-- Aniversário opcional do cliente (CRM v2) — lembrete UI nos próximos 7 dias
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS birth_date DATE;

COMMENT ON COLUMN public.clients.birth_date IS 'Data de nascimento do cliente (opcional). Usada para lembrete de aniversário no CRM.';

-- Inclui birth_date no payload do perfil (mantém filtro por auth.uid() do dono)
CREATE OR REPLACE FUNCTION public.get_client_profile(p_client_id uuid)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH
  base_client AS MATERIALIZED (
    SELECT
      id, user_id, name, email, phone,
      notes, loyalty_tier, last_visit, total_visits,
      next_prediction, photo_url, rating, is_active, created_at,
      birth_date
    FROM clients
    WHERE id = p_client_id
      AND user_id = (auth.uid())::text
  ),

  appts AS (
    SELECT
      a.id,
      a.appointment_time,
      a.status,
      a.price,
      a.total_price,
      a.service,
      a.notes        AS appointment_notes,
      a.payment_method,
      a.duration_minutes,
      a.created_at,
      tm.name        AS professional_name
    FROM appointments a
    LEFT JOIN team_members tm ON tm.id = a.professional_id
    WHERE a.client_id = p_client_id
      AND a.user_id = (auth.uid())::text
      AND a.status = 'Completed'
    ORDER BY a.appointment_time DESC
  ),

  hair AS (
    SELECT id, date, image_url, service, barber, created_at
    FROM hair_records
    WHERE client_id = p_client_id
      AND user_id = (auth.uid())::text
    ORDER BY date DESC
  ),

  ltv AS (
    SELECT COALESCE(SUM(price), 0) AS total
    FROM appts
  ),

  last_appt AS (
    SELECT appointment_time FROM appts
    ORDER BY appointment_time DESC LIMIT 1
  )

  SELECT json_build_object(
    'client',               row_to_json(bc),
    'ltv',                  lv.total,
    'total_visits',         (SELECT COUNT(*) FROM appts),
    'last_visit',           (SELECT appointment_time FROM last_appt),
    'appointments_history', COALESCE((SELECT json_agg(a ORDER BY a.appointment_time DESC) FROM appts a), '[]'::json),
    'hair_history',         COALESCE((SELECT json_agg(h ORDER BY h.date DESC) FROM hair h), '[]'::json)
  )
  FROM base_client bc
  CROSS JOIN ltv lv;
$function$;
