-- Harness local para 20261007160000_auto_confirm_online_bookings.
-- Postgres descartável. Não toca o Supabase de produção.
--
-- Carregado DEPOIS da cadeia booking_notifications (completed_noshow → #123 → cutoff → #125 →
-- edit_request → PR-6 → notifications → #127 → type check), que já reproduz prod para
-- accept/reject v2, notify_*, cancel v2, update v2, get_public_business_settings_json etc.
-- Aqui entram as peças que aquela cadeia só tinha como stub (ou não tinha): o caminho
-- real de create_public_booking (#117), bloqueios, slot_busy, produtos, broadcast e sync.
-- Corpos copiados das migrations de origem; o script confere o md5 de pg_get_functiondef
-- de cada função contra prod (2026-10-07) antes de rodar qualquer teste.

-- Tabelas / colunas usadas pelos corpos reais -------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.agenda_blocks
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text,
  sale_price numeric(10,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.appointment_product_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  appointment_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL,
  unit_sale_price numeric(10,2) NOT NULL,
  UNIQUE (appointment_id, product_id)
);

-- RLS de business_settings como em prod (toggle só do dono) -----------------------------
CREATE OR REPLACE FUNCTION public.get_auth_role()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid()::text;
  RETURN v_role;
END;
$function$;

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner can manage" ON public.business_settings;
CREATE POLICY "Owner can manage" ON public.business_settings
  FOR ALL USING ((auth.uid())::text = user_id) WITH CHECK ((auth.uid())::text = user_id);
DROP POLICY IF EXISTS "Settings: company read" ON public.business_settings;
CREATE POLICY "Settings: company read" ON public.business_settings
  FOR SELECT TO authenticated USING (user_id = public.get_auth_company_id());
DROP POLICY IF EXISTS "Settings: owner update" ON public.business_settings;
CREATE POLICY "Settings: owner update" ON public.business_settings
  FOR UPDATE TO authenticated
  USING (user_id = public.get_auth_company_id() AND public.get_auth_role() = 'owner')
  WITH CHECK (user_id = public.get_auth_company_id() AND public.get_auth_role() = 'owner');
-- prod: anon/authenticated têm arwdDxtm na tabela; quem barra é a RLS.
GRANT ALL ON public.business_settings TO anon, authenticated, service_role;

-- Corpos de prod ---------------------------------------------------------------------------


-- business_timezone: corpo de supabase/migrations/20260925120000_business_timezone.sql (md5 conferido contra prod pelo script)
CREATE OR REPLACE FUNCTION public.business_timezone(p_business_id text)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_tz text;
  v_region text;
BEGIN
  SELECT NULLIF(trim(bs.timezone), '')
    INTO v_tz
    FROM public.business_settings bs
   WHERE bs.user_id = p_business_id
   LIMIT 1;

  IF v_tz IS NOT NULL THEN
    BEGIN
      -- Valida o nome IANA sem varrer pg_timezone_names (lento).
      PERFORM now() AT TIME ZONE v_tz;
      RETURN v_tz;
    EXCEPTION WHEN OTHERS THEN
      v_tz := NULL; -- inválido: cai para a região
    END;
  END IF;

  SELECT upper(trim(p.region))
    INTO v_region
    FROM public.profiles p
   WHERE p.id::text = p_business_id
   LIMIT 1;

  IF v_region = 'PT' THEN
    RETURN 'Europe/Lisbon';
  END IF;

  -- BR e região desconhecida: America/Sao_Paulo (comportamento histórico do
  -- app para não-PT e mercado majoritário; o dono pode alterar em Ajustes).
  RETURN 'America/Sao_Paulo';
END;
$$;

-- confirmed_booking_slot_released: corpo de supabase/migrations/20260925160000_noshow_frees_slot.sql (md5 conferido contra prod pelo script)
CREATE OR REPLACE FUNCTION public.confirmed_booking_slot_released(
  p_business_id text,
  p_appointment_time timestamp with time zone,
  p_professional_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  -- Um public_booking 'confirmed' já virou agendamento (accept_public_booking
  -- insere o appointment no MESMO horário e profissional — ou no profissional
  -- padrão quando o pedido veio sem profissional). Se TODOS os agendamentos
  -- correspondentes estão Cancelled/NoShow, o pedido não segura mais o horário.
  -- Sem agendamento correspondente (legado / 'confirmed' sem cliente), nada muda.
  SELECT EXISTS (
           SELECT 1 FROM public.appointments a
           WHERE a.user_id = p_business_id
             AND a.appointment_time = p_appointment_time
             AND (p_professional_id IS NULL OR a.professional_id = p_professional_id)
             AND a.status IN ('Cancelled', 'NoShow')
         )
     AND NOT EXISTS (
           SELECT 1 FROM public.appointments a
           WHERE a.user_id = p_business_id
             AND a.appointment_time = p_appointment_time
             AND (p_professional_id IS NULL OR a.professional_id = p_professional_id)
             AND a.status NOT IN ('Cancelled', 'NoShow')
         );
$function$;

-- public_booking_linked_appointments: corpo de supabase/migrations/20260925170000_booking_cancel_sync.sql (md5 conferido contra prod pelo script)
CREATE OR REPLACE FUNCTION public.public_booking_linked_appointments(p_booking_id uuid)
RETURNS TABLE(appointment_id uuid, status text, updated_at timestamptz)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT a.id, a.status, a.updated_at
  FROM public.public_bookings pb
  JOIN public.appointments a ON a.user_id = pb.business_id
  WHERE pb.id = p_booking_id
    AND (
      a.public_booking_id = pb.id
      OR (
        -- linhas antigas (accept sem vínculo): mesmo horário, profissional
        -- compatível e o cliente do agendamento tem o telefone do pedido
        a.public_booking_id IS NULL
        AND a.appointment_time = pb.appointment_time
        AND (pb.professional_id IS NULL OR a.professional_id = pb.professional_id)
        AND EXISTS (
          SELECT 1 FROM public.clients c
          WHERE c.id = a.client_id
            AND public.phones_match(c.phone, pb.customer_phone)
        )
      )
    );
$function$;

-- sync_public_booking_on_appointment_cancel: corpo de supabase/migrations/20260925170000_booking_cancel_sync.sql (md5 conferido contra prod pelo script)
CREATE OR REPLACE FUNCTION public.sync_public_booking_on_appointment_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    UPDATE public.public_bookings pb
       SET status = 'cancelled',
           updated_at = NOW()
     WHERE pb.business_id = NEW.user_id
       AND pb.status = 'confirmed'
       AND (
         pb.id = NEW.public_booking_id
         OR (NEW.public_booking_id IS NULL AND pb.appointment_time = NEW.appointment_time)
       )
       AND EXISTS (
         SELECT 1 FROM public.public_booking_linked_appointments(pb.id) l
         WHERE l.appointment_id = NEW.id
       )
       AND NOT EXISTS (
         SELECT 1 FROM public.public_booking_linked_appointments(pb.id) l
         WHERE l.status IS DISTINCT FROM 'Cancelled'
       );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_public_booking_on_appointment_cancel(%): %', NEW.id, SQLERRM;
  END;
  RETURN NULL;
END;
$function$;

-- agenda_interval_blocked: corpo de supabase/migrations/20261002120000_agenda_blocks.sql (md5 conferido contra prod pelo script)
CREATE OR REPLACE FUNCTION public.agenda_interval_blocked(
  p_user_id text,
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_professional_id IS NOT NULL THEN
      EXISTS (
        SELECT 1 FROM public.agenda_blocks b
        WHERE b.user_id = p_user_id
          AND b.professional_id = p_professional_id
          AND b.starts_at < p_ends_at
          AND b.ends_at > p_starts_at
      )
    ELSE
      EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.user_id = p_user_id
          AND COALESCE(tm.active, true)
          AND tm.deleted_at IS NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.user_id = p_user_id
          AND COALESCE(tm.active, true)
          AND tm.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM public.agenda_blocks b
            WHERE b.user_id = p_user_id
              AND b.professional_id = tm.id
              AND b.starts_at < p_ends_at
              AND b.ends_at > p_starts_at
          )
      )
  END;
$function$;

-- agenda_any_professional_busy: corpo de supabase/migrations/20261003120000_agenda_blocks_acceptance_followup.sql (md5 conferido contra prod pelo script)
CREATE OR REPLACE FUNCTION public.agenda_any_professional_busy(
  p_user_id text,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT (
    SELECT count(*)
    FROM public.team_members tm
    WHERE tm.user_id = p_user_id
      AND COALESCE(tm.active, true)
      AND tm.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.user_id = p_user_id
          AND a.professional_id = tm.id
          AND COALESCE(a.status, '') NOT IN ('Cancelled', 'NoShow')
          AND a.appointment_time > p_starts_at - interval '1 day'
          AND a.appointment_time < p_ends_at
          AND (a.appointment_time + make_interval(mins => GREATEST(COALESCE(a.duration_minutes, 30), 1))) > p_starts_at
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.public_bookings pb
        WHERE pb.business_id = p_user_id
          AND pb.professional_id = tm.id
          AND pb.status IN ('pending', 'confirmed')
          AND NOT (pb.status = 'confirmed' AND public.confirmed_booking_slot_released(pb.business_id, pb.appointment_time, pb.professional_id))
          AND pb.appointment_time > p_starts_at - interval '1 day'
          AND pb.appointment_time < p_ends_at
          AND (pb.appointment_time + make_interval(mins => GREATEST(COALESCE(pb.duration_minutes, 30), 1))) > p_starts_at
      )
      AND NOT public.agenda_interval_blocked(p_user_id, tm.id, p_starts_at, p_ends_at)
  ) <= (
    SELECT count(*) FROM (
      SELECT 1 FROM public.appointments a
      WHERE a.user_id = p_user_id
        AND a.professional_id IS NULL
        AND COALESCE(a.status, '') NOT IN ('Cancelled', 'NoShow')
        AND a.appointment_time > p_starts_at - interval '1 day'
        AND a.appointment_time < p_ends_at
        AND (a.appointment_time + make_interval(mins => GREATEST(COALESCE(a.duration_minutes, 30), 1))) > p_starts_at
      UNION ALL
      SELECT 1 FROM public.public_bookings pb
      WHERE pb.business_id = p_user_id
        AND pb.professional_id IS NULL
        AND pb.status IN ('pending', 'confirmed')
        AND NOT (pb.status = 'confirmed' AND public.confirmed_booking_slot_released(pb.business_id, pb.appointment_time, pb.professional_id))
        AND pb.appointment_time > p_starts_at - interval '1 day'
        AND pb.appointment_time < p_ends_at
        AND (pb.appointment_time + make_interval(mins => GREATEST(COALESCE(pb.duration_minutes, 30), 1))) > p_starts_at
    ) unassigned
  );
$function$;

-- enforce_agenda_block_on_appointments: corpo de supabase/migrations/20261003120000_agenda_blocks_acceptance_followup.sql (md5 conferido contra prod pelo script)
CREATE OR REPLACE FUNCTION public.enforce_agenda_block_on_appointments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_end timestamptz;
  v_name text;
BEGIN
  IF NEW.status IN ('Cancelled', 'NoShow', 'Completed') THEN
    RETURN NEW;
  END IF;
  IF NEW.professional_id IS NULL THEN
    RETURN NEW;
  END IF;
  -- Status só muda de verdade quando o anterior ainda ocupava o horário.
  -- Cancelled/NoShow/Completed reaberto para Confirmed/Pending volta a ser checado (B-42).
  IF TG_OP = 'UPDATE'
     AND NEW.appointment_time IS NOT DISTINCT FROM OLD.appointment_time
     AND NEW.professional_id IS NOT DISTINCT FROM OLD.professional_id
     AND NEW.duration_minutes IS NOT DISTINCT FROM OLD.duration_minutes
     AND OLD.status NOT IN ('Cancelled', 'NoShow', 'Completed') THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id, 0));

  v_end := NEW.appointment_time + make_interval(mins => GREATEST(COALESCE(NEW.duration_minutes, 30), 1));
  IF public.agenda_interval_blocked(NEW.user_id, NEW.professional_id, NEW.appointment_time, v_end) THEN
    SELECT tm.name INTO v_name
    FROM public.team_members tm
    WHERE tm.id = NEW.professional_id AND tm.user_id = NEW.user_id;
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = format(
        'Horário bloqueado na agenda de %s. Para agendar, remova o bloqueio primeiro.',
        COALESCE(NULLIF(btrim(v_name), ''), 'profissional')
      ),
      HINT = 'professional_blocked';
  END IF;
  RETURN NEW;
END;
$function$;

-- enforce_agenda_block_on_public_bookings: corpo de supabase/migrations/20261003120000_agenda_blocks_acceptance_followup.sql (md5 conferido contra prod pelo script)
CREATE OR REPLACE FUNCTION public.enforce_agenda_block_on_public_bookings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_end timestamptz;
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' AND NEW.status IS DISTINCT FROM 'confirmed' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND NEW.appointment_time IS NOT DISTINCT FROM OLD.appointment_time
     AND NEW.professional_id IS NOT DISTINCT FROM OLD.professional_id
     AND NEW.duration_minutes IS NOT DISTINCT FROM OLD.duration_minutes THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.business_id, 0));

  -- B-44: insert direto sem profissional recebe o primeiro livre (ou slot_unavailable).
  IF NEW.professional_id IS NULL THEN
    NEW.professional_id := public.get_first_available_professional(
      NEW.business_id::uuid,
      NEW.appointment_time,
      NEW.duration_minutes
    );
    IF NEW.professional_id IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'slot_unavailable',
        HINT = 'slot_unavailable';
    END IF;
  END IF;

  v_end := NEW.appointment_time + make_interval(mins => GREATEST(COALESCE(NEW.duration_minutes, 30), 1));
  IF public.agenda_interval_blocked(NEW.business_id, NEW.professional_id, NEW.appointment_time, v_end) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'slot_unavailable',
      HINT = 'agenda_blocked';
  END IF;
  RETURN NEW;
END;
$function$;

-- get_first_available_professional: corpo de supabase/migrations/20261003120000_agenda_blocks_acceptance_followup.sql (md5 conferido contra prod pelo script)
CREATE OR REPLACE FUNCTION public.get_first_available_professional(
  p_business_id uuid,
  p_appointment_time timestamp with time zone,
  p_duration_min integer DEFAULT 30
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_end timestamptz;
  v_unassigned integer;
  v_pro uuid;
  v_company text := p_business_id::text;
BEGIN
  IF p_appointment_time IS NULL THEN
    RETURN NULL;
  END IF;
  v_end := p_appointment_time + make_interval(mins => GREATEST(COALESCE(p_duration_min, 30), 1));

  SELECT count(*) INTO v_unassigned
  FROM (
    SELECT 1 FROM public.appointments a
    WHERE a.user_id = v_company
      AND a.professional_id IS NULL
      AND COALESCE(a.status, '') NOT IN ('Cancelled', 'NoShow')
      AND a.appointment_time < v_end
      AND (a.appointment_time + make_interval(mins => GREATEST(COALESCE(a.duration_minutes, 30), 1))) > p_appointment_time
    UNION ALL
    SELECT 1 FROM public.public_bookings pb
    WHERE pb.business_id = v_company
      AND pb.professional_id IS NULL
      AND pb.status IN ('pending', 'confirmed')
      AND NOT (pb.status = 'confirmed' AND public.confirmed_booking_slot_released(pb.business_id, pb.appointment_time, pb.professional_id))
      AND pb.appointment_time < v_end
      AND (pb.appointment_time + make_interval(mins => GREATEST(COALESCE(pb.duration_minutes, 30), 1))) > p_appointment_time
  ) u;

  SELECT tm.id INTO v_pro
  FROM public.team_members tm
  WHERE tm.user_id = v_company
    AND COALESCE(tm.active, true)
    AND tm.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.professional_id = tm.id
        AND a.user_id = v_company
        AND COALESCE(a.status, '') NOT IN ('Cancelled', 'NoShow')
        AND a.appointment_time < v_end
        AND (a.appointment_time + make_interval(mins => GREATEST(COALESCE(a.duration_minutes, 30), 1))) > p_appointment_time
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.public_bookings pb
      WHERE pb.professional_id = tm.id
        AND pb.business_id = v_company
        AND pb.status IN ('pending', 'confirmed')
        AND NOT (pb.status = 'confirmed' AND public.confirmed_booking_slot_released(pb.business_id, pb.appointment_time, pb.professional_id))
        AND pb.appointment_time < v_end
        AND (pb.appointment_time + make_interval(mins => GREATEST(COALESCE(pb.duration_minutes, 30), 1))) > p_appointment_time
    )
    AND NOT public.agenda_interval_blocked(v_company, tm.id, p_appointment_time, v_end)
  ORDER BY tm.is_owner DESC NULLS LAST, tm.display_order NULLS LAST, tm.created_at NULLS LAST
  OFFSET GREATEST(v_unassigned, 0)
  LIMIT 1;

  RETURN v_pro;
END;
$function$;

-- public_booking_slot_busy: corpo de supabase/migrations/20261003120000_agenda_blocks_acceptance_followup.sql (md5 conferido contra prod pelo script)
CREATE OR REPLACE FUNCTION public.public_booking_slot_busy(p_business_id text, p_appointment_time timestamp with time zone, p_duration_minutes integer, p_professional_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_professional_id IS NOT NULL THEN EXISTS (
      SELECT 1
      FROM public.appointments a
      WHERE a.user_id::text = p_business_id
        AND COALESCE(a.status, '') NOT IN ('Cancelled', 'NoShow')
        AND a.professional_id = p_professional_id
        AND a.appointment_time < p_appointment_time + make_interval(mins => GREATEST(COALESCE(p_duration_minutes, 30), 1))
        AND (a.appointment_time + make_interval(mins => GREATEST(COALESCE(a.duration_minutes, 30), 1))) > p_appointment_time
      UNION ALL
      SELECT 1
      FROM public.public_bookings pb
      WHERE pb.business_id = p_business_id
        AND pb.status IN ('pending', 'confirmed')
        AND NOT (pb.status = 'confirmed' AND public.confirmed_booking_slot_released(pb.business_id, pb.appointment_time, pb.professional_id))
        AND pb.professional_id = p_professional_id
        AND pb.appointment_time < p_appointment_time + make_interval(mins => GREATEST(COALESCE(p_duration_minutes, 30), 1))
        AND (pb.appointment_time + make_interval(mins => GREATEST(COALESCE(pb.duration_minutes, 30), 1))) > p_appointment_time
      UNION ALL
      SELECT 1
      WHERE public.agenda_interval_blocked(
        p_business_id, p_professional_id, p_appointment_time,
        p_appointment_time + make_interval(mins => GREATEST(COALESCE(p_duration_minutes, 30), 1))
      )
    )
    ELSE public.agenda_any_professional_busy(
      p_business_id,
      p_appointment_time,
      p_appointment_time + make_interval(mins => GREATEST(COALESCE(p_duration_minutes, 30), 1))
    )
  END;
$function$;

-- create_public_booking: corpo de supabase/migrations/20261003120000_agenda_blocks_acceptance_followup.sql (md5 conferido contra prod pelo script)
CREATE OR REPLACE FUNCTION public.create_public_booking(
  p_business_id TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_service_ids UUID[],
  p_professional_id UUID,
  p_appointment_time TIMESTAMPTZ,
  p_total_price NUMERIC,
  p_duration_minutes INTEGER,
  p_product_lines JSONB DEFAULT '[]'::jsonb
)
RETURNS SETOF public.public_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id TEXT;
  v_duration INTEGER;
  v_booking public.public_bookings%ROWTYPE;
BEGIN
  v_business_id := btrim(COALESCE(p_business_id, ''));
  IF v_business_id = '' THEN
    RAISE EXCEPTION 'invalid_business';
  END IF;

  IF btrim(COALESCE(p_customer_name, '')) = '' OR btrim(COALESCE(p_customer_phone, '')) = '' THEN
    RAISE EXCEPTION 'invalid_customer';
  END IF;

  IF p_service_ids IS NULL OR array_length(p_service_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'invalid_services';
  END IF;

  IF p_appointment_time IS NULL OR p_appointment_time <= NOW() THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

  v_duration := LEAST(1440, GREATEST(COALESCE(p_duration_minutes, 30), 1));

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_business_id
  ) THEN
    RAISE EXCEPTION 'invalid_business';
  END IF;

  IF p_professional_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.id = p_professional_id
      AND tm.user_id::text = v_business_id
      AND tm.active = true
      AND tm.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'invalid_professional';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_business_id, 0));

  IF p_professional_id IS NULL THEN
    p_professional_id := public.get_first_available_professional(v_business_id::uuid, p_appointment_time, v_duration);
  END IF;
  IF p_professional_id IS NULL THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

  IF public.public_booking_slot_busy(
    v_business_id,
    p_appointment_time,
    v_duration,
    p_professional_id
  ) THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

  INSERT INTO public.public_bookings (
    business_id,
    customer_name,
    customer_phone,
    service_ids,
    professional_id,
    appointment_time,
    total_price,
    status,
    duration_minutes,
    product_lines
  ) VALUES (
    v_business_id,
    btrim(p_customer_name),
    btrim(p_customer_phone),
    p_service_ids,
    p_professional_id,
    p_appointment_time,
    COALESCE(p_total_price, 0),
    'pending',
    v_duration,
    COALESCE(p_product_lines, '[]'::jsonb)
  )
  RETURNING * INTO v_booking;

  RETURN NEXT v_booking;
END;
$$;

-- public_bookings_broadcast: corpo de supabase/migrations/20261003192135_public_bookings_realtime.sql (md5 conferido contra prod pelo script)
CREATE OR REPLACE FUNCTION public.public_bookings_broadcast()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.appointment_time IS NOT DISTINCT FROM OLD.appointment_time THEN
    RETURN NULL;
  END IF;

  BEGIN
    PERFORM realtime.send(
      jsonb_build_object(
        'id', NEW.id,
        'status', NEW.status,
        'appointment_time', NEW.appointment_time,
        'op', TG_OP,
        'at', now()
      ),
      'booking_status',
      'booking:' || NEW.id::text,
      true
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'public_bookings_broadcast: %', SQLERRM;
  END;

  RETURN NULL;
END;
$$;



-- phones_match e copy_booking_products_to_appointment: em prod o corpo está com fim de linha CRLF.
-- Recriados com replace(LF → CRLF) para o md5 de pg_get_functiondef bater com prod.
DO $outer$
BEGIN
  EXECUTE replace($src$CREATE OR REPLACE FUNCTION public.phones_match(p_a text, p_b text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    CASE
      WHEN regexp_replace(COALESCE(p_a, ''), '\D', '', 'g') = '' THEN false
      WHEN regexp_replace(COALESCE(p_b, ''), '\D', '', 'g') = '' THEN false
      WHEN regexp_replace(p_a, '\D', '', 'g') = regexp_replace(p_b, '\D', '', 'g') THEN true
      ELSE (
        length(regexp_replace(p_a, '\D', '', 'g')) >= 8
        AND length(regexp_replace(p_b, '\D', '', 'g')) >= 8
        AND right(regexp_replace(p_a, '\D', '', 'g'), 8) = right(regexp_replace(p_b, '\D', '', 'g'), 8)
      )
    END;
$function$$src$, E'\n', E'\r\n');

  EXECUTE replace($src$CREATE OR REPLACE FUNCTION public.copy_booking_products_to_appointment(p_booking_id uuid, p_appointment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id TEXT;
  v_lines JSONB;
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_price DECIMAL(10,2);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  SELECT COALESCE(get_auth_company_id(), auth.uid()::TEXT) INTO v_company_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.appointments
    WHERE id = p_appointment_id AND user_id::TEXT = v_company_id
  ) THEN
    RAISE EXCEPTION 'appointment_not_found';
  END IF;

  SELECT product_lines INTO v_lines
  FROM public.public_bookings
  WHERE id = p_booking_id
    AND business_id::TEXT = v_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF v_lines IS NULL OR jsonb_typeof(v_lines) <> 'array' THEN
    RETURN;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_lines)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := GREATEST(COALESCE((v_item->>'quantity')::INTEGER, 0), 0);
    IF v_product_id IS NULL OR v_qty <= 0 THEN
      CONTINUE;
    END IF;

    SELECT sale_price INTO v_price
    FROM public.products
    WHERE id = v_product_id
      AND company_id::TEXT = v_company_id
      AND is_active = TRUE;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    INSERT INTO public.appointment_product_lines (
      company_id, appointment_id, product_id, quantity, unit_sale_price
    ) VALUES (
      v_company_id::UUID, p_appointment_id, v_product_id, v_qty, v_price
    )
    ON CONFLICT (appointment_id, product_id)
    DO UPDATE SET
      quantity = public.appointment_product_lines.quantity + EXCLUDED.quantity,
      unit_sale_price = EXCLUDED.unit_sale_price;
  END LOOP;
END;
$function$$src$, E'\n', E'\r\n');
END
$outer$;

ALTER FUNCTION public.sync_public_booking_on_appointment_cancel() SET lock_timeout = '2s';

-- ACL igual a prod -------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.phones_match(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phones_match(text, text) TO PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.business_timezone(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.business_timezone(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.confirmed_booking_slot_released(text, timestamptz, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirmed_booking_slot_released(text, timestamptz, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.public_booking_linked_appointments(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_booking_linked_appointments(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.sync_public_booking_on_appointment_cancel() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_public_booking_on_appointment_cancel() TO service_role;
REVOKE ALL ON FUNCTION public.agenda_interval_blocked(text, uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agenda_interval_blocked(text, uuid, timestamptz, timestamptz) TO service_role;
REVOKE ALL ON FUNCTION public.agenda_any_professional_busy(text, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agenda_any_professional_busy(text, timestamptz, timestamptz) TO service_role;
REVOKE ALL ON FUNCTION public.enforce_agenda_block_on_appointments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_agenda_block_on_appointments() TO service_role;
REVOKE ALL ON FUNCTION public.enforce_agenda_block_on_public_bookings() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_agenda_block_on_public_bookings() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_first_available_professional(uuid, timestamptz, integer) TO PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.public_booking_slot_busy(text, timestamptz, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_booking_slot_busy(text, timestamptz, integer, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_public_booking(text, text, text, uuid[], uuid, timestamptz, numeric, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_booking(text, text, text, uuid[], uuid, timestamptz, numeric, integer, jsonb) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.public_bookings_broadcast() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_bookings_broadcast() TO PUBLIC, authenticated, service_role;
REVOKE ALL ON FUNCTION public.copy_booking_products_to_appointment(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.copy_booking_products_to_appointment(uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_public_business_settings_json(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_business_settings_json(uuid) TO anon, authenticated, service_role;

-- Triggers de bloqueio como em prod --------------------------------------------------------
DROP TRIGGER IF EXISTS enforce_agenda_block_on_appointments ON public.appointments;
CREATE TRIGGER enforce_agenda_block_on_appointments BEFORE INSERT OR UPDATE OF appointment_time, professional_id, duration_minutes, status ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.enforce_agenda_block_on_appointments();
DROP TRIGGER IF EXISTS enforce_agenda_block_on_public_bookings ON public.public_bookings;
CREATE TRIGGER enforce_agenda_block_on_public_bookings BEFORE INSERT OR UPDATE OF appointment_time, professional_id, duration_minutes, status ON public.public_bookings FOR EACH ROW EXECUTE FUNCTION public.enforce_agenda_block_on_public_bookings();
