BEGIN;
REVOKE ALL ON FUNCTION public.create_public_booking_private(text,text,text,uuid[],uuid,timestamptz,numeric,integer,jsonb,text),
 public.get_public_booking_with_token(uuid,text),public.cancel_public_booking_with_token(uuid,text),
 public.update_public_booking_with_token(uuid,text,uuid[],uuid,timestamptz,timestamptz,text,text,numeric,integer,jsonb) FROM PUBLIC,anon,authenticated,service_role;
DO $$ DECLARE f record; a record; BEGIN
 FOR f IN SELECT * FROM agendix_private.sec02_function_snapshot LOOP
  EXECUTE f.definition;
  EXECUTE 'REVOKE ALL ON FUNCTION '||f.signature||' FROM PUBLIC,anon,authenticated,service_role';
  FOR a IN SELECT * FROM aclexplode(coalesce(f.acl,acldefault('f',(SELECT proowner FROM pg_proc WHERE oid=to_regprocedure(f.signature))))) LOOP
   EXECUTE 'GRANT '||a.privilege_type||' ON FUNCTION '||f.signature||' TO '||CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END||CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END;
  END LOOP;
 END LOOP;
END $$;
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT * FROM agendix_private.sec02_policy_snapshot LOOP
  EXECUTE format('ALTER POLICY %I ON realtime.messages TO %s USING (%s)',p.name,p.roles,p.expression);
 END LOOP;
END $$;
COMMIT;
