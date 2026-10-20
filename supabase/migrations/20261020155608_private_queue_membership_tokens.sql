BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS agendix_private.public_access_function_snapshot (
 signature text PRIMARY KEY, definition text NOT NULL, acl aclitem[]
);
REVOKE ALL ON agendix_private.public_access_function_snapshot FROM PUBLIC,anon,authenticated;
INSERT INTO agendix_private.public_access_function_snapshot
SELECT p.oid::regprocedure::text,pg_get_functiondef(p.oid),p.proacl FROM pg_proc p
WHERE p.pronamespace='public'::regnamespace AND p.proname IN (
 'create_public_booking_private','update_public_booking_with_token','materialize_public_booking_appointment','accept_public_booking_v2',
 'join_queue_entry','get_queue_entry_public','get_queue_public_board','cancel_queue_entry_public','create_public_membership_request'
) ON CONFLICT(signature) DO NOTHING;
CREATE OR REPLACE FUNCTION agendix_private.new_access_token() RETURNS text
LANGUAGE plpgsql VOLATILE SET search_path='' AS $$
DECLARE crypto_schema text; token text;
BEGIN
 SELECT n.nspname INTO STRICT crypto_schema FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='pgcrypto';
 EXECUTE format('SELECT encode(%I.gen_random_bytes(32),''hex'')',crypto_schema) INTO token;
 RETURN token;
END $$;
REVOKE ALL ON FUNCTION agendix_private.new_access_token() FROM PUBLIC,anon,authenticated;
ALTER FUNCTION public.materialize_public_booking_appointment(public.public_bookings) SET search_path='';
ALTER FUNCTION public.accept_public_booking_v2(uuid) SET search_path='';
CREATE OR REPLACE FUNCTION public.create_public_booking_private(
 p_business_id text,p_customer_name text,p_customer_phone text,p_service_ids uuid[],p_professional_id uuid,
 p_appointment_time timestamptz,p_total_price numeric,p_duration_minutes integer,p_product_lines jsonb DEFAULT '[]',p_customer_email text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.public_bookings; t text; expiry timestamptz;
BEGIN
 IF length(coalesce(p_customer_email,''))>254 THEN RAISE EXCEPTION 'email_invalid'; END IF;
 SELECT * INTO STRICT b FROM public.create_public_booking(p_business_id,p_customer_name,p_customer_phone,p_service_ids,p_professional_id,p_appointment_time,p_total_price,p_duration_minutes,p_product_lines);
 UPDATE public.public_bookings SET customer_email=nullif(btrim(p_customer_email),'') WHERE id=b.id RETURNING * INTO b;
 t:=agendix_private.new_access_token();
 expiry:=b.appointment_time+interval '48 hours';
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
 IF p_customer_phone IS DISTINCT FROM b.customer_phone THEN RAISE EXCEPTION 'customer_phone_immutable'; END IF;
 RETURN QUERY SELECT * FROM public.update_public_booking_by_client_v2(b.id,b.customer_phone,p_service_ids,p_professional_id,p_appointment_time,p_original_appointment_time,p_customer_name,b.customer_phone,p_total_price,p_duration_minutes,p_product_lines);

END $$;

CREATE OR REPLACE FUNCTION agendix_private.bound_booking_access_expiry() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE agendix_private.public_booking_access
 SET expires_at=least(expires_at,NEW.appointment_time+interval '48 hours') WHERE booking_id=NEW.id;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION agendix_private.bound_booking_access_expiry() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS bound_booking_access_expiry ON public.public_bookings;
CREATE TRIGGER bound_booking_access_expiry AFTER UPDATE OF appointment_time ON public.public_bookings
FOR EACH ROW EXECUTE FUNCTION agendix_private.bound_booking_access_expiry();
UPDATE agendix_private.public_booking_access a SET expires_at=least(a.expires_at,b.appointment_time+interval '48 hours')
FROM public.public_bookings b WHERE b.id=a.booking_id;
CREATE TABLE IF NOT EXISTS agendix_private.queue_entry_access (
 entry_id uuid PRIMARY KEY REFERENCES public.queue_entries(id) ON DELETE CASCADE,
 token_hash bytea NOT NULL UNIQUE CHECK(octet_length(token_hash)=32),
 expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS agendix_private.client_membership_access (
 membership_id uuid PRIMARY KEY REFERENCES public.client_memberships(id) ON DELETE CASCADE,
 token_hash bytea NOT NULL UNIQUE CHECK(octet_length(token_hash)=32),
 expires_at timestamptz NOT NULL
);
ALTER TABLE agendix_private.queue_entry_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendix_private.client_membership_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON agendix_private.queue_entry_access,agendix_private.client_membership_access FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.join_queue_entry_private(
 p_slug text,p_client_name text,p_client_phone text,p_service_id uuid,p_professional_id uuid DEFAULT NULL,
 p_payment_method text DEFAULT 'cash',p_br_code text DEFAULT NULL,p_txid text DEFAULT NULL,p_mbway_phone text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; entry public.queue_entries; token text;
BEGIN
 result:=public.join_queue_entry(p_slug,p_client_name,p_client_phone,p_service_id,p_professional_id,p_payment_method,p_br_code,p_txid,p_mbway_phone);
 SELECT * INTO STRICT entry FROM public.queue_entries WHERE id=(result->>'id')::uuid;
 token:=agendix_private.new_access_token();
 INSERT INTO agendix_private.queue_entry_access VALUES(entry.id,sha256(convert_to(token,'UTF8')),entry.joined_at+interval '48 hours');
 RETURN jsonb_build_object('entry',to_jsonb(entry),'management_token',token);
END $$;
CREATE OR REPLACE FUNCTION public.get_queue_entry_with_token(p_entry_id uuid,p_token text)
RETURNS SETOF public.queue_entries LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT q.* FROM public.queue_entries q JOIN agendix_private.queue_entry_access a ON a.entry_id=q.id
 WHERE q.id=p_entry_id AND length(p_token)=64 AND a.token_hash=sha256(convert_to(p_token,'UTF8')) AND a.expires_at>now()
$$;
CREATE OR REPLACE FUNCTION public.get_queue_board_with_token(p_entry_id uuid,p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE entry public.queue_entries;
BEGIN
 SELECT * INTO entry FROM public.get_queue_entry_with_token(p_entry_id,p_token);
 IF NOT FOUND THEN RAISE EXCEPTION 'queue_entry_not_found'; END IF;
 RETURN public.get_queue_public_board(entry.id,entry.client_phone);
END $$;
CREATE OR REPLACE FUNCTION public.cancel_queue_entry_with_token(p_entry_id uuid,p_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE entry public.queue_entries;
BEGIN
 SELECT * INTO entry FROM public.get_queue_entry_with_token(p_entry_id,p_token);
 IF NOT FOUND THEN RAISE EXCEPTION 'queue_entry_not_found'; END IF;
 RETURN public.cancel_queue_entry_public(entry.id,entry.client_phone);
END $$;
CREATE OR REPLACE FUNCTION public.create_client_membership_private(
 p_business_id text,p_client_name text,p_client_phone text,p_plan_id uuid,p_payment_method text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_client_id uuid; v_membership_id uuid; token text; v_phone text:=regexp_replace(coalesce(p_client_phone,''),'\D','','g');
BEGIN
 IF length(v_phone)<9 THEN RAISE EXCEPTION 'invalid_phone'; END IF;
 IF length(btrim(coalesce(p_client_name,'')))<2 OR length(p_client_name)>80 THEN RAISE EXCEPTION 'invalid_name'; END IF;
 IF p_payment_method IS NULL OR p_payment_method NOT IN ('pix','in_person','mbway') THEN RAISE EXCEPTION 'invalid_payment_method'; END IF;
 PERFORM 1 FROM public.membership_plans WHERE id=p_plan_id AND user_id::text=p_business_id AND active;
 IF NOT FOUND THEN RAISE EXCEPTION 'plan_not_found'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id,0));
 SELECT c.id INTO v_client_id FROM public.clients c WHERE c.user_id::text=p_business_id AND public.phones_match(c.phone,v_phone) ORDER BY c.id LIMIT 1;
 IF v_client_id IS NULL THEN
  INSERT INTO public.clients(user_id,name,phone) VALUES(p_business_id,btrim(p_client_name),v_phone) RETURNING id INTO v_client_id;
 END IF;
 IF EXISTS(SELECT 1 FROM public.client_memberships cm WHERE cm.user_id=p_business_id AND cm.client_id=v_client_id AND cm.status IN ('pending','active','overdue')) THEN
  RAISE EXCEPTION 'membership_already_exists';
 END IF;
 INSERT INTO public.client_memberships(user_id,client_id,plan_id,status,payment_method,starts_at)
 VALUES(p_business_id,v_client_id,p_plan_id,'pending',p_payment_method,now()) RETURNING id INTO v_membership_id;
 token:=agendix_private.new_access_token();
 INSERT INTO agendix_private.client_membership_access VALUES(v_membership_id,sha256(convert_to(token,'UTF8')),now()+interval '1 year');
 RETURN jsonb_build_object('membership_id',v_membership_id,'management_token',token);
END $$;
CREATE OR REPLACE FUNCTION public.get_client_membership_with_token(p_business_id text,p_token text)
RETURNS TABLE (
  membership_id UUID,
  stored_status TEXT,
  effective_status TEXT,
  plan_id UUID,
  plan_name TEXT,
  plan_description TEXT,
  price_cents INTEGER,
  badge_color TEXT,
  service_ids UUID[],
  service_names TEXT[],
  usage_limit_per_month INTEGER,
  usage_this_period INTEGER,
  starts_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  next_billing_at TIMESTAMPTZ,
  last_paid_at TIMESTAMPTZ,
  payment_method TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT
    cm.id,
    cm.status,
    CASE
      WHEN cm.status = 'active'
        AND cm.next_billing_at IS NOT NULL
        AND cm.next_billing_at < NOW()
      THEN 'overdue'::TEXT
      ELSE cm.status
    END,
    mp.id,
    mp.name,
    mp.description,
    mp.price_cents,
    mp.badge_color,
    mp.service_ids,
    ARRAY(
      SELECT s.name
      FROM public.services s
      WHERE s.user_id::text = p_business_id AND s.id = ANY (mp.service_ids)
      ORDER BY array_position(mp.service_ids, s.id)
    ),
    mp.usage_limit_per_month,
    (
      SELECT COUNT(*)::INTEGER
      FROM public.appointments a
      WHERE a.client_id = cm.client_id
        AND a.user_id::text = p_business_id
        AND a.status = 'Completed'
        AND LOWER(COALESCE(a.payment_method, '')) = 'membership'
        AND (cm.current_period_start IS NULL OR a.appointment_time >= cm.current_period_start)
        AND (cm.current_period_end IS NULL OR a.appointment_time < cm.current_period_end)
    ),
    cm.starts_at,
    cm.current_period_start,
    cm.current_period_end,
    cm.next_billing_at,
    cm.last_paid_at,
    cm.payment_method
  FROM public.client_memberships cm
  JOIN public.membership_plans mp ON mp.id = cm.plan_id AND mp.user_id::text = p_business_id
  WHERE cm.user_id = p_business_id
    AND EXISTS(SELECT 1 FROM agendix_private.client_membership_access a WHERE a.membership_id=cm.id AND length(p_token)=64 AND a.token_hash=sha256(convert_to(p_token,'UTF8')) AND a.expires_at>now())
  ORDER BY cm.created_at DESC
  LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.cancel_client_membership_with_token(p_business_id text,p_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE membership_id uuid;
BEGIN
 SELECT m.membership_id INTO membership_id FROM public.get_client_membership_with_token(p_business_id,p_token) m;
 IF NOT FOUND THEN RAISE EXCEPTION 'membership_not_found'; END IF;
 UPDATE public.client_memberships cm SET status='cancelled',cancelled_at=now(),updated_at=now()
 WHERE cm.id=membership_id AND cm.user_id=p_business_id;
 RETURN membership_id;
END $$;
CREATE OR REPLACE FUNCTION public.issue_client_membership_link(p_membership_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE token text; tenant text:=public.get_auth_company_id();
BEGIN
 IF auth.uid() IS NULL OR public.get_auth_role() IS DISTINCT FROM 'owner' OR tenant IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
 PERFORM 1 FROM public.client_memberships cm WHERE cm.id=p_membership_id AND cm.user_id=tenant FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'membership_not_found'; END IF;
 token:=agendix_private.new_access_token();
 INSERT INTO agendix_private.client_membership_access VALUES(p_membership_id,sha256(convert_to(token,'UTF8')),now()+interval '1 year')
 ON CONFLICT(membership_id) DO UPDATE SET token_hash=EXCLUDED.token_hash,expires_at=EXCLUDED.expires_at;
 RETURN token;
END $$;
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname IN (
 'join_queue_entry','get_queue_entry_public','get_queue_public_board','cancel_queue_entry_public','create_public_membership_request'
 ) LOOP EXECUTE 'REVOKE ALL ON FUNCTION '||f.signature||' FROM PUBLIC,anon,authenticated'; END LOOP;
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname IN (
 'join_queue_entry_private','get_queue_entry_with_token','get_queue_board_with_token','cancel_queue_entry_with_token',
 'create_client_membership_private','get_client_membership_with_token','cancel_client_membership_with_token'
 ) LOOP
  EXECUTE 'REVOKE ALL ON FUNCTION '||f.signature||' FROM PUBLIC';
  EXECUTE 'GRANT EXECUTE ON FUNCTION '||f.signature||' TO anon,authenticated,service_role';
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.issue_client_membership_link(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.issue_client_membership_link(uuid) TO authenticated;
COMMIT;
