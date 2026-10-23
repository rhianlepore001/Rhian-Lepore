-- Does not restore expiration values shortened by the migration.
BEGIN;
DROP TRIGGER IF EXISTS bound_booking_access_expiry ON public.public_bookings;
DO $$ DECLARE f record; a record; BEGIN
 FOR f IN SELECT * FROM agendix_private.public_access_function_snapshot LOOP
  EXECUTE f.definition;
  EXECUTE 'REVOKE ALL ON FUNCTION '||f.signature||' FROM PUBLIC,anon,authenticated,service_role';
  FOR a IN SELECT * FROM aclexplode(coalesce(f.acl,acldefault('f',(SELECT proowner FROM pg_proc WHERE oid=to_regprocedure(f.signature))))) LOOP
   EXECUTE 'GRANT '||a.privilege_type||' ON FUNCTION '||f.signature||' TO '||CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END||CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END;
  END LOOP;
 END LOOP;
END $$;
DROP FUNCTION IF EXISTS public.join_queue_entry_private(text,text,text,uuid,uuid,text,text,text,text);
DROP FUNCTION IF EXISTS public.get_queue_board_with_token(uuid,text);
DROP FUNCTION IF EXISTS public.cancel_queue_entry_with_token(uuid,text);
DROP FUNCTION IF EXISTS public.get_queue_entry_with_token(uuid,text);
DROP FUNCTION IF EXISTS public.create_client_membership_private(text,text,text,uuid,text);
DROP FUNCTION IF EXISTS public.cancel_client_membership_with_token(text,text);
DROP FUNCTION IF EXISTS public.get_client_membership_with_token(text,text);
DROP FUNCTION IF EXISTS public.issue_client_membership_link(uuid);
COMMIT;
