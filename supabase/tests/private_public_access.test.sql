\ir ../../security/tests/local-only.sql
BEGIN;
SET TIMEZONE='UTC';
SET client_min_messages=notice;
INSERT INTO public.profiles(id,role,company_id,business_slug) VALUES
 ('b3000000-0000-4000-8000-000000000001','owner','b3000000-0000-4000-8000-000000000001','private-test-a'),
 ('b3000000-0000-4000-8000-000000000002','owner','b3000000-0000-4000-8000-000000000002','private-test-b');
INSERT INTO public.business_settings(user_id,queue_mode) VALUES ('b3000000-0000-4000-8000-000000000001','shared');
INSERT INTO public.team_members(id,user_id,name,is_owner,active) VALUES
 ('b3000000-0000-4000-8001-000000000001','b3000000-0000-4000-8000-000000000001','Profissional',true,true);
INSERT INTO public.services(id,user_id,name,price,duration_minutes) VALUES
 ('b3000000-0000-4000-8002-000000000001','b3000000-0000-4000-8000-000000000001','Serviço',40,30);
INSERT INTO public.membership_plans(id,user_id,name,price_cents,service_ids) VALUES
 ('b3000000-0000-4000-8003-000000000001','b3000000-0000-4000-8000-000000000001','Plano',4000,ARRAY['b3000000-0000-4000-8002-000000000001']::uuid[]);
DO $$
DECLARE r jsonb; b uuid; t text; expiry timestamptz; q uuid; qt text; m uuid; mt text; rotated text;
BEGIN
 SET LOCAL ROLE anon;
 r:=public.create_public_booking_private('b3000000-0000-4000-8000-000000000001','Cliente','11988887777',ARRAY['b3000000-0000-4000-8002-000000000001']::uuid[],'b3000000-0000-4000-8001-000000000001',now()+interval '10 days',40,30);
 b:=(r->'booking'->>'id')::uuid; t:=r->>'management_token'; expiry:=(r->>'management_expires_at')::timestamptz;
 IF expiry<>(r->'booking'->>'appointment_time')::timestamptz+interval '48 hours' THEN RAISE EXCEPTION 'BOOKING_EXPIRY_NOT_48H'; END IF;
 BEGIN
  PERFORM public.update_public_booking_with_token(b,t,ARRAY['b3000000-0000-4000-8002-000000000001']::uuid[],'b3000000-0000-4000-8001-000000000001',now()+interval '11 days',now()+interval '10 days','Cliente','11900000000',40,30);
  RAISE EXCEPTION 'PHONE_CHANGE_ALLOWED';
 EXCEPTION WHEN SQLSTATE 'P0001' THEN IF SQLERRM<>'customer_phone_immutable' THEN RAISE; END IF; END;
 PERFORM public.update_public_booking_with_token(b,t,ARRAY['b3000000-0000-4000-8002-000000000001']::uuid[],'b3000000-0000-4000-8001-000000000001',now()+interval '20 days',now()+interval '10 days','Cliente','11988887777',40,30);
 RESET ROLE;
 IF (SELECT expires_at FROM agendix_private.public_booking_access WHERE booking_id=b)<>expiry+interval '10 days' THEN RAISE EXCEPTION 'BOOKING_EXPIRY_FOLLOWS_RESCHEDULE_PLUS_10_DAYS'; END IF;
 IF (SELECT expires_at FROM agendix_private.public_booking_access WHERE booking_id=b)<>now()+interval '22 days' THEN RAISE EXCEPTION 'BOOKING_EXPIRY_HAS_EXTRA_TIME'; END IF;
 SET LOCAL ROLE anon;
 IF (SELECT appointment_time FROM public.get_public_booking_with_token(b,t))<>now()+interval '20 days' THEN RAISE EXCEPTION 'RESCHEDULED_BOOKING_LINK_INVALID'; END IF;
 RESET ROLE;
 IF EXISTS(SELECT 1 FROM public.public_bookings WHERE id=b AND customer_phone<>'11988887777') THEN RAISE EXCEPTION 'BOOKING_PHONE_CHANGED'; END IF;
 UPDATE public.public_bookings SET appointment_time=now()+interval '5 days' WHERE id=b;
 IF (SELECT expires_at FROM agendix_private.public_booking_access WHERE booking_id=b)<>now()+interval '7 days' THEN RAISE EXCEPTION 'EARLIER_BOOKING_EXPIRY'; END IF;
 UPDATE public.public_bookings SET appointment_time=now()+interval '20 days' WHERE id=b;
 IF (SELECT expires_at FROM agendix_private.public_booking_access WHERE booking_id=b)<>now()+interval '22 days' THEN RAISE EXCEPTION 'LATER_BOOKING_EXPIRY'; END IF;
 SET LOCAL ROLE anon;
 r:=public.join_queue_entry_private('private-test-a','Cliente','11988887777','b3000000-0000-4000-8002-000000000001');
 q:=(r->'entry'->>'id')::uuid; qt:=r->>'management_token';
 IF qt !~ '^[a-f0-9]{64}$' OR NOT EXISTS(SELECT 1 FROM public.get_queue_entry_with_token(q,qt)) THEN RAISE EXCEPTION 'QUEUE_PRIVATE_JOIN'; END IF;
 IF EXISTS(SELECT 1 FROM public.get_queue_entry_with_token(q,'11988887777')) OR EXISTS(SELECT 1 FROM public.get_queue_entry_with_token(q,NULL)) OR EXISTS(SELECT 1 FROM public.get_queue_entry_with_token(gen_random_uuid(),qt)) THEN RAISE EXCEPTION 'QUEUE_TOKEN_BYPASS'; END IF;
 IF (public.get_queue_board_with_token(q,qt)->>'position')::int<>1 THEN RAISE EXCEPTION 'QUEUE_BOARD'; END IF;
 BEGIN
  PERFORM public.cancel_queue_entry_with_token(q,repeat('0',64)); RAISE EXCEPTION 'QUEUE_WRONG_CANCEL';
 EXCEPTION WHEN SQLSTATE 'P0001' THEN IF SQLERRM<>'queue_entry_not_found' THEN RAISE; END IF; END;
 RESET ROLE;
 UPDATE public.queue_entries SET status='calling' WHERE id=q;
 SET LOCAL ROLE anon;
 IF (SELECT status FROM public.get_queue_entry_with_token(q,qt))<>'calling' THEN RAISE EXCEPTION 'QUEUE_STATUS_REFRESH'; END IF;
 IF NOT public.cancel_queue_entry_with_token(q,qt) THEN RAISE EXCEPTION 'QUEUE_CANCEL'; END IF;
 RESET ROLE;
 UPDATE agendix_private.queue_entry_access SET expires_at=now()-interval '1 second' WHERE entry_id=q;
 SET LOCAL ROLE anon;
 IF EXISTS(SELECT 1 FROM public.get_queue_entry_with_token(q,qt)) THEN RAISE EXCEPTION 'QUEUE_EXPIRED'; END IF;
 r:=public.create_client_membership_private('b3000000-0000-4000-8000-000000000001','Cliente','11988887777','b3000000-0000-4000-8003-000000000001','in_person');
 m:=(r->>'membership_id')::uuid; mt:=r->>'management_token';
 IF mt !~ '^[a-f0-9]{64}$' OR (SELECT stored_status FROM public.get_client_membership_with_token('b3000000-0000-4000-8000-000000000001',mt))<>'pending' THEN RAISE EXCEPTION 'MEMBERSHIP_PRIVATE_CREATE'; END IF;
 IF EXISTS(SELECT 1 FROM public.get_client_membership_with_token('b3000000-0000-4000-8000-000000000002',mt)) OR EXISTS(SELECT 1 FROM public.get_client_membership_with_token('b3000000-0000-4000-8000-000000000001','11988887777')) THEN RAISE EXCEPTION 'MEMBERSHIP_TOKEN_BYPASS'; END IF;
 BEGIN
  PERFORM public.create_client_membership_private('b3000000-0000-4000-8000-000000000001','Intruso','11988887777','b3000000-0000-4000-8003-000000000001','pix');
  RAISE EXCEPTION 'MEMBERSHIP_TOKEN_REISSUED_BY_PHONE';
 EXCEPTION WHEN SQLSTATE 'P0001' THEN IF SQLERRM<>'membership_already_exists' THEN RAISE; END IF; END;
 RESET ROLE;
 UPDATE public.client_memberships SET status='active' WHERE id=m;
 SET LOCAL ROLE anon;
 IF (SELECT effective_status FROM public.get_client_membership_with_token('b3000000-0000-4000-8000-000000000001',mt))<>'active' THEN RAISE EXCEPTION 'MEMBERSHIP_STATUS_REFRESH'; END IF;
 BEGIN
  PERFORM public.cancel_client_membership_with_token('b3000000-0000-4000-8000-000000000001',repeat('0',64)); RAISE EXCEPTION 'MEMBERSHIP_WRONG_CANCEL';
 EXCEPTION WHEN SQLSTATE 'P0001' THEN IF SQLERRM<>'membership_not_found' THEN RAISE; END IF; END;
 IF public.cancel_client_membership_with_token('b3000000-0000-4000-8000-000000000001',mt)<>m THEN RAISE EXCEPTION 'MEMBERSHIP_CANCEL'; END IF;
 RESET ROLE;
 IF (SELECT status FROM public.client_memberships WHERE id=m)<>'cancelled' THEN RAISE EXCEPTION 'MEMBERSHIP_NOT_CANCELLED'; END IF;
 PERFORM set_config('request.jwt.claim.sub','b3000000-0000-4000-8000-000000000002',true);
 SET LOCAL ROLE authenticated;
 BEGIN
  PERFORM public.issue_client_membership_link(m); RAISE EXCEPTION 'OTHER_TENANT_ISSUED_LINK';
 EXCEPTION WHEN SQLSTATE 'P0001' THEN IF SQLERRM<>'membership_not_found' THEN RAISE; END IF; END;
 RESET ROLE;
 PERFORM set_config('request.jwt.claim.sub','b3000000-0000-4000-8000-000000000001',true);
 SET LOCAL ROLE authenticated;
 rotated:=public.issue_client_membership_link(m);
 RESET ROLE;
 SET LOCAL ROLE anon;
 IF EXISTS(SELECT 1 FROM public.get_client_membership_with_token('b3000000-0000-4000-8000-000000000001',mt)) OR NOT EXISTS(SELECT 1 FROM public.get_client_membership_with_token('b3000000-0000-4000-8000-000000000001',rotated)) THEN RAISE EXCEPTION 'MEMBERSHIP_ROTATION'; END IF;
 RESET ROLE;
 IF EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname IN ('join_queue_entry','get_queue_entry_public','get_queue_public_board','cancel_queue_entry_public','create_public_membership_request','get_public_client_membership','cancel_public_client_membership','find_active_queue_entry_by_phone','get_active_booking_by_phone') AND (has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE'))) THEN RAISE EXCEPTION 'LEGACY_PHONE_GRANT'; END IF;
 INSERT INTO public.public_bookings(business_id,customer_name,customer_phone,service_ids,appointment_time,total_price) VALUES('b3000000-0000-4000-8000-000000000001','Legado','11944443333','{}',now()+interval '25 days',0) RETURNING id INTO b;
 INSERT INTO public.queue_entries(business_id,client_name,client_phone,status) VALUES('b3000000-0000-4000-8000-000000000001','Legado','11944443333','waiting') RETURNING id INTO q;
 SET LOCAL ROLE anon;
 IF EXISTS(SELECT 1 FROM public.get_public_booking_with_token(b,t)) OR EXISTS(SELECT 1 FROM public.get_queue_entry_with_token(q,qt)) THEN RAISE EXCEPTION 'LEGACY_WITHOUT_TOKEN_VISIBLE'; END IF;
 RESET ROLE;
 IF has_function_privilege('anon','public.issue_client_membership_link(uuid)','EXECUTE') THEN RAISE EXCEPTION 'ANON_CAN_ISSUE_LINK'; END IF;
 IF EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname IN ('materialize_public_booking_appointment','accept_public_booking_v2') AND NOT ('search_path=""'=ANY(p.proconfig))) THEN RAISE EXCEPTION 'UNSAFE_SEARCH_PATH'; END IF;
 RAISE NOTICE 'PASS booking phone immutability/48h/reschedule +10 days; queue join/read/status/board/cancel; membership create/read/duplicate/cancel/owner rotation; tenant and legacy ACL isolation';
END $$;
ROLLBACK;
