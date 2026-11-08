-- Local/admin-only rollback. Export chair_hour_private.history and routine_backup first:
-- removing this version history loses the protection for configuration changes since installation.
-- Execute BEFORE the stage1 rollback. No customer rows/receipts are deleted.
BEGIN;
DROP FUNCTION IF EXISTS public.complete_appointment_checkout_v1(uuid,text,uuid,uuid,numeric,numeric,numeric,integer,jsonb);
DROP FUNCTION IF EXISTS public.get_checkout_products_v1(text,boolean);
DROP TRIGGER IF EXISTS chair_capture_professional ON public.team_members;
DROP TRIGGER IF EXISTS chair_capture_business ON public.business_settings;
DROP TRIGGER IF EXISTS chair_capture_material ON public.service_costs;
DROP POLICY IF EXISTS chair_finance_owner_only ON public.finance_records;
DROP POLICY IF EXISTS chair_products_owner_only ON public.products;
DROP POLICY IF EXISTS chair_products_owner_only ON public.product_sales;
DO $$ DECLARE r record; a record; grantee text; BEGIN
 IF to_regclass('chair_hour_private.routine_backup') IS NULL THEN RETURN; END IF;
 IF to_regprocedure('chair_hour_private.sell_product(uuid,integer,uuid,uuid,uuid,text)') IS NOT NULL THEN
  DROP FUNCTION IF EXISTS public.sell_product(uuid,integer,uuid,uuid,uuid,text);
  ALTER FUNCTION chair_hour_private.sell_product(uuid,integer,uuid,uuid,uuid,text) SET SCHEMA public;
 END IF;
 FOR r IN SELECT * FROM chair_hour_private.routine_backup LOOP
  EXECUTE r.definition;
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',r.identity);
  FOR a IN SELECT * FROM aclexplode(r.original_acl) WHERE privilege_type='EXECUTE' LOOP
   grantee:=CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END;
   EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %s%s',r.identity,grantee,CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END);
  END LOOP;
 END LOOP;
END $$;
DROP FUNCTION IF EXISTS chair_hour_private.capture_history();
DROP TABLE IF EXISTS chair_hour_private.history;
DROP TABLE IF EXISTS chair_hour_private.routine_backup;
DROP SCHEMA IF EXISTS chair_hour_private;
COMMIT;
