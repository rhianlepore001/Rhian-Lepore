BEGIN;
CREATE SCHEMA IF NOT EXISTS agendix_private;
REVOKE ALL ON SCHEMA agendix_private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS agendix_private.sec02_function_snapshot (
 signature text PRIMARY KEY, definition text NOT NULL, acl aclitem[]
);
REVOKE ALL ON agendix_private.sec02_function_snapshot FROM PUBLIC, anon, authenticated;
INSERT INTO agendix_private.sec02_function_snapshot(signature,definition,acl)
SELECT p.oid::regprocedure::text, pg_get_functiondef(p.oid), p.proacl
FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname IN (
 'get_public_client_by_phone','find_client_by_phone_normalized','get_active_booking_by_phone',
 'get_booking_by_id','get_booking_by_id_v2','get_public_booking_by_id',
 'get_client_bookings_history','get_client_bookings_history_v2','get_client_booking_cancellations',
 'cancel_public_booking_by_client','cancel_public_booking_by_client_v2',
 'update_public_booking_by_client','update_public_booking_by_client_v2',
 'get_public_client_membership','cancel_public_client_membership',
 'find_active_queue_entry_by_phone',
 'create_public_booking','upsert_public_client','mirror_public_client_to_crm',
 'materialize_public_booking_appointment','accept_public_booking_v2'
) ON CONFLICT(signature) DO NOTHING;
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT signature FROM agendix_private.sec02_function_snapshot
 WHERE signature NOT LIKE 'upsert_public_client(%' AND signature NOT LIKE 'mirror_public_client_to_crm(%'
 AND signature NOT LIKE 'materialize_public_booking_appointment(%' AND signature NOT LIKE 'accept_public_booking_v2(%'
 LOOP EXECUTE 'REVOKE ALL ON FUNCTION '||f.signature||' FROM PUBLIC, anon, authenticated'; END LOOP;
END $$;
CREATE TABLE IF NOT EXISTS agendix_private.public_booking_access (
 booking_id uuid PRIMARY KEY REFERENCES public.public_bookings(id) ON DELETE CASCADE,
 token_hash bytea NOT NULL CHECK(octet_length(token_hash)=32),
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE agendix_private.public_booking_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON agendix_private.public_booking_access FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.upsert_public_client(
 p_business_id uuid, p_name text, p_phone text, p_photo_url text DEFAULT NULL, p_email text DEFAULT NULL
) RETURNS TABLE(id uuid,name varchar,email varchar,phone varchar,photo_url text,business_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_name text:=nullif(btrim(p_name),''); v_digits text:=regexp_replace(coalesce(p_phone,''),'\D','','g');
BEGIN
 IF p_business_id IS NULL OR NOT public.business_exists(p_business_id::text) THEN RAISE EXCEPTION 'invalid_business'; END IF;
 IF length(v_digits)<8 THEN RAISE EXCEPTION 'phone_invalid'; END IF;
 IF v_name IS NULL OR length(v_name)>80 THEN RAISE EXCEPTION 'name_invalid'; END IF;
 IF length(coalesce(p_email,''))>254 OR length(coalesce(p_photo_url,''))>2000 THEN RAISE EXCEPTION 'contact_invalid'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id::text,0));
 IF NOT EXISTS(SELECT 1 FROM public.public_clients c WHERE c.business_id::text=p_business_id::text AND public.phones_match(c.phone,p_phone))
 AND NOT EXISTS(SELECT 1 FROM public.clients c WHERE c.user_id::text=p_business_id::text AND public.phones_match(c.phone,p_phone)) THEN
  INSERT INTO public.public_clients(business_id,name,phone,email,photo_url,last_booking_at)
  VALUES(p_business_id::text,v_name,p_phone,p_email,p_photo_url,now());
 END IF;
 RETURN QUERY SELECT gen_random_uuid(),v_name::varchar,p_email::varchar,p_phone::varchar,p_photo_url,p_business_id::text;
END $$;
REVOKE ALL ON FUNCTION public.upsert_public_client(uuid,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_public_client(uuid,text,text,text,text) TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.mirror_public_client_to_crm(
 p_user_id text,p_name text,p_phone text,p_email text DEFAULT NULL,p_photo_url text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_tenant text:=coalesce(public.get_auth_company_id(),auth.uid()::text);
BEGIN
 IF nullif(btrim(p_user_id),'') IS NULL OR nullif(btrim(p_phone),'') IS NULL THEN RAISE EXCEPTION 'invalid_contact'; END IF;
 IF v_tenant IS NOT NULL AND v_tenant<>p_user_id THEN RAISE EXCEPTION 'tenant_mismatch'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id,0));
 IF EXISTS(SELECT 1 FROM public.clients c WHERE c.user_id::text=p_user_id AND public.phones_match(c.phone,p_phone)) THEN RETURN; END IF;
 INSERT INTO public.clients(user_id,name,phone,email,photo_url,source)
 VALUES(p_user_id,p_name,p_phone,p_email,p_photo_url,'agendamento_online') ON CONFLICT(user_id,phone) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.mirror_public_client_to_crm(text,text,text,text,text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.create_public_booking_private(
 p_business_id text,p_customer_name text,p_customer_phone text,p_service_ids uuid[],p_professional_id uuid,
 p_appointment_time timestamptz,p_total_price numeric,p_duration_minutes integer,p_product_lines jsonb DEFAULT '[]',p_customer_email text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.public_bookings; t text; expiry timestamptz;
BEGIN
 IF length(coalesce(p_customer_email,''))>254 THEN RAISE EXCEPTION 'email_invalid'; END IF;
 SELECT * INTO STRICT b FROM public.create_public_booking(p_business_id,p_customer_name,p_customer_phone,p_service_ids,p_professional_id,p_appointment_time,p_total_price,p_duration_minutes,p_product_lines);
 UPDATE public.public_bookings SET customer_email=nullif(btrim(p_customer_email),'') WHERE id=b.id RETURNING * INTO b;
 t:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
 expiry:=greatest(now()+interval '30 days',b.appointment_time+interval '7 days');
 INSERT INTO agendix_private.public_booking_access(booking_id,token_hash,expires_at) VALUES(b.id,sha256(convert_to(t,'UTF8')),expiry);
 RETURN jsonb_build_object('booking',to_jsonb(b),'management_token',t,'management_expires_at',expiry);
END $$;
CREATE OR REPLACE FUNCTION public.get_public_booking_with_token(p_booking_id uuid,p_token text)
RETURNS SETOF public.public_bookings LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT b.* FROM public.public_bookings b JOIN agendix_private.public_booking_access a ON a.booking_id=b.id
 WHERE b.id=p_booking_id AND length(p_token)=64 AND a.token_hash=sha256(convert_to(p_token,'UTF8')) AND a.expires_at>now()
$$;
CREATE OR REPLACE FUNCTION public.cancel_public_booking_with_token(p_booking_id uuid,p_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.public_bookings;
BEGIN
 SELECT * INTO b FROM public.get_public_booking_with_token(p_booking_id,p_token);
 IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found'; END IF;
 RETURN public.cancel_public_booking_by_client_v2(b.id,b.customer_phone);
END $$;
CREATE OR REPLACE FUNCTION public.update_public_booking_with_token(
 p_booking_id uuid,p_token text,p_service_ids uuid[],p_professional_id uuid,p_appointment_time timestamptz,
 p_original_appointment_time timestamptz,p_customer_name text,p_customer_phone text,p_total_price numeric,p_duration_minutes integer,p_product_lines jsonb DEFAULT '[]'
) RETURNS SETOF public.public_bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.public_bookings;
BEGIN
 SELECT * INTO b FROM public.get_public_booking_with_token(p_booking_id,p_token);
 IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found'; END IF;
 RETURN QUERY SELECT * FROM public.update_public_booking_by_client_v2(b.id,b.customer_phone,p_service_ids,p_professional_id,p_appointment_time,p_original_appointment_time,p_customer_name,p_customer_phone,p_total_price,p_duration_minutes,p_product_lines);
 UPDATE agendix_private.public_booking_access SET expires_at=greatest(expires_at,p_appointment_time+interval '7 days') WHERE booking_id=b.id;
END $$;
REVOKE ALL ON FUNCTION public.create_public_booking_private(text,text,text,uuid[],uuid,timestamptz,numeric,integer,jsonb,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_booking_with_token(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_public_booking_with_token(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_public_booking_with_token(uuid,text,uuid[],uuid,timestamptz,timestamptz,text,text,numeric,integer,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_booking_private(text,text,text,uuid[],uuid,timestamptz,numeric,integer,jsonb,text),
 public.get_public_booking_with_token(uuid,text),public.cancel_public_booking_with_token(uuid,text),
 public.update_public_booking_with_token(uuid,text,uuid[],uuid,timestamptz,timestamptz,text,text,numeric,integer,jsonb) TO anon,authenticated,service_role;
CREATE TABLE IF NOT EXISTS agendix_private.sec02_policy_snapshot(name text PRIMARY KEY, roles text NOT NULL, expression text NOT NULL);
REVOKE ALL ON agendix_private.sec02_policy_snapshot FROM PUBLIC,anon,authenticated;
INSERT INTO agendix_private.sec02_policy_snapshot
SELECT polname,array_to_string(ARRAY(SELECT CASE WHEN r=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(r)) END FROM unnest(polroles) r),','),pg_get_expr(polqual,polrelid)
FROM pg_policy WHERE polrelid='realtime.messages'::regclass AND polname='Booking topics are readable'
ON CONFLICT(name) DO NOTHING;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM agendix_private.sec02_policy_snapshot WHERE name='Booking topics are readable') THEN
  ALTER POLICY "Booking topics are readable" ON realtime.messages TO authenticated
  USING (realtime.topic() LIKE 'booking:%' AND realtime.messages.extension='broadcast'
    AND EXISTS(SELECT 1 FROM public.public_bookings b WHERE 'booking:'||b.id::text=realtime.topic() AND b.business_id=public.get_auth_company_id()));
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.materialize_public_booking_appointment(p_booking public.public_bookings)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id TEXT := p_booking.business_id;
  v_client_id UUID;
  v_service_names TEXT;
  v_professional_id UUID;
  v_appointment_id UUID;
  v_photo TEXT;
BEGIN
  IF v_company_id IS NULL OR btrim(v_company_id) = '' THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  SELECT c.id INTO v_client_id
  FROM public.clients c
  WHERE c.user_id::text = v_company_id
    AND public.phones_match(c.phone, p_booking.customer_phone)
  ORDER BY c.id
  LIMIT 1;

  SELECT pc.photo_url INTO v_photo
  FROM public.public_clients pc
  WHERE public.phones_match(pc.phone, p_booking.customer_phone)
    AND pc.business_id::text = v_company_id
  ORDER BY pc.created_at DESC
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (user_id, name, phone, email, photo_url)
    VALUES (
      v_company_id,
      p_booking.customer_name,
      p_booking.customer_phone,
      p_booking.customer_email,
      v_photo
    )
    RETURNING id INTO v_client_id;
  END IF;

  SELECT string_agg(s.name, ', ' ORDER BY s.name)
    INTO v_service_names
  FROM public.services s
  WHERE s.user_id::text = v_company_id
    AND s.id = ANY (p_booking.service_ids);

  v_service_names := COALESCE(NULLIF(v_service_names, ''), 'Serviço');

  v_professional_id := p_booking.professional_id;
  IF v_professional_id IS NULL THEN
    SELECT tm.id INTO v_professional_id
    FROM public.team_members tm
    WHERE tm.user_id::text = v_company_id
      AND tm.active = true
      AND tm.deleted_at IS NULL
    ORDER BY tm.is_owner DESC NULLS LAST, tm.display_order NULLS LAST, tm.created_at
    LIMIT 1;
  END IF;

  INSERT INTO public.appointments (
    user_id, client_id, professional_id, service, appointment_time, price, status,
    duration_minutes, public_booking_id
  ) VALUES (
    v_company_id, v_client_id, v_professional_id, v_service_names,
    p_booking.appointment_time, p_booking.total_price, 'Confirmed',
    COALESCE(p_booking.duration_minutes, 30), p_booking.id
  )
  RETURNING id INTO v_appointment_id;

  -- Mesmo contrato do aceite: falha na cópia de produtos não derruba o agendamento.
  BEGIN
    PERFORM public.copy_public_booking_products_internal(p_booking.id, v_appointment_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'materialize_public_booking_appointment products(%): %', p_booking.id, SQLERRM;
  END;

  RETURN v_appointment_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_public_booking_v2(p_booking_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id TEXT;
  v_booking public.public_bookings%ROWTYPE;
  v_client_id UUID;
  v_service_names TEXT;
  v_professional_id UUID;
  v_appointment_id UUID;
  v_photo TEXT;
  v_is_edit boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  v_company_id := public.get_auth_company_id();
  IF v_company_id IS NULL OR btrim(v_company_id) = '' THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  SELECT * INTO v_booking
  FROM public.public_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND OR v_booking.business_id IS DISTINCT FROM v_company_id THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF v_booking.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'booking_not_pending';
  END IF;

  IF NOT public.caller_can_act_on_public_booking(v_booking) THEN
    RAISE EXCEPTION 'not_allowed_for_booking';
  END IF;

  v_is_edit := (v_booking.status = 'pending' AND COALESCE(v_booking.is_edit, false));

  SELECT c.id INTO v_client_id
  FROM public.clients c
  WHERE c.user_id::text = v_company_id
    AND public.phones_match(c.phone, v_booking.customer_phone)
  ORDER BY c.id
  LIMIT 1;

  SELECT pc.photo_url INTO v_photo
  FROM public.public_clients pc
  WHERE public.phones_match(pc.phone, v_booking.customer_phone)
    AND pc.business_id::text = v_company_id
  ORDER BY pc.created_at DESC
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (user_id, name, phone, email, photo_url)
    VALUES (
      v_company_id,
      v_booking.customer_name,
      v_booking.customer_phone,
      v_booking.customer_email,
      v_photo
    )
    RETURNING id INTO v_client_id;
  END IF;

  SELECT string_agg(s.name, ', ' ORDER BY s.name)
    INTO v_service_names
  FROM public.services s
  WHERE s.user_id::text = v_company_id
    AND s.id = ANY (v_booking.service_ids);

  v_service_names := COALESCE(NULLIF(v_service_names, ''), 'Serviço');

  v_professional_id := v_booking.professional_id;
  IF v_professional_id IS NULL THEN
    SELECT tm.id INTO v_professional_id
    FROM public.team_members tm
    WHERE tm.user_id::text = v_company_id
      AND tm.active = true
      AND tm.deleted_at IS NULL
    ORDER BY tm.is_owner DESC NULLS LAST, tm.display_order NULLS LAST, tm.created_at
    LIMIT 1;
  END IF;

  IF v_is_edit THEN
    IF COALESCE(v_booking.original_appointment_time, v_booking.appointment_time) <= now()
       OR EXISTS (
         SELECT 1
         FROM public.public_booking_linked_appointments(v_booking.id) l
         WHERE l.status IN ('Completed', 'NoShow')
       ) THEN
      RAISE EXCEPTION 'booking_not_pending';
    END IF;

    SELECT l.appointment_id
      INTO v_appointment_id
    FROM public.public_booking_linked_appointments(v_booking.id) l
    WHERE l.status IS DISTINCT FROM 'Cancelled'
    ORDER BY l.updated_at DESC NULLS LAST
    LIMIT 1;

    IF v_appointment_id IS NOT NULL THEN
      IF public.client_edit_request_slot_conflict(
        v_company_id,
        v_booking.appointment_time,
        COALESCE(v_booking.duration_minutes, 30),
        v_professional_id,
        v_booking.id,
        true
      ) THEN
        RAISE EXCEPTION 'slot_unavailable';
      END IF;

      UPDATE public.appointments
      SET
        appointment_time = v_booking.appointment_time,
        professional_id = v_professional_id,
        duration_minutes = COALESCE(v_booking.duration_minutes, 30),
        price = v_booking.total_price,
        service = v_service_names,
        status = 'Confirmed',
        updated_at = NOW()
      WHERE id = v_appointment_id
        AND user_id = v_company_id;
    END IF;
  END IF;

  IF v_appointment_id IS NULL THEN
    INSERT INTO public.appointments (
      user_id, client_id, professional_id, service, appointment_time, price, status,
      duration_minutes, public_booking_id
    ) VALUES (
      v_company_id, v_client_id, v_professional_id, v_service_names,
      v_booking.appointment_time, v_booking.total_price, 'Confirmed',
      COALESCE(v_booking.duration_minutes, 30), v_booking.id
    )
    RETURNING id INTO v_appointment_id;
  END IF;

  UPDATE public.public_bookings
  SET
    status = 'confirmed',
    is_edit = false,
    original_appointment_time = NULL,
    original_professional_id = NULL,
    original_service_ids = NULL,
    original_duration_minutes = NULL,
    original_total_price = NULL,
    original_product_lines = NULL,
    updated_at = NOW()
  WHERE id = v_booking.id
    AND business_id = v_company_id;

  BEGIN
    PERFORM public.copy_booking_products_to_appointment(v_booking.id, v_appointment_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN json_build_object(
    'appointment_id', v_appointment_id,
    'booking_id', v_booking.id,
    'service_names', v_service_names,
    'customer_name', v_booking.customer_name,
    'customer_phone', v_booking.customer_phone,
    'appointment_time', v_booking.appointment_time,
    'total_price', v_booking.total_price
  );
END;
$function$;

COMMIT;
