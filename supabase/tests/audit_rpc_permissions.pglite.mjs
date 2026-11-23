// Synthetic grant/RLS harness for the audit permission migration.
// Run with: PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node supabase/tests/audit_rpc_permissions.pglite.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const migration = await readFile(resolve(root, 'supabase/migrations/20261120131450_harden_audit_rpc_permissions.sql'), 'utf8');
const sqlAssertions = await readFile(resolve(here, 'audit_rpc_permissions.sql'), 'utf8');
const rollback = await readFile(resolve(root, 'docs/rollbacks/20261120131450_harden_audit_rpc_permissions.rollback.sql'), 'utf8');
const pgliteModule = process.env.PGLITE_MODULE ?? '@electric-sql/pglite';
const { PGlite } = await import(pgliteModule);

const db = new PGlite();
await db.exec(`
  CREATE ROLE anon;
  CREATE ROLE authenticated;
  CREATE ROLE service_role;
  CREATE TABLE public.audit_logs (
    id uuid,
    user_id uuid,
    action text,
    resource_type text,
    created_at timestamptz,
    company_id uuid
  );
  CREATE TABLE public.profiles (id uuid, full_name text);
  CREATE TABLE public.team_members (id uuid, deleted_at timestamptz);
  CREATE TABLE public.appointments (id uuid, deleted_at timestamptz);
  CREATE TABLE public.clients (id uuid, deleted_at timestamptz);
  CREATE TABLE public.financial_records (id uuid, deleted_at timestamptz);
  CREATE TABLE public.services (id uuid, deleted_at timestamptz);
  CREATE FUNCTION public.cleanup_old_deleted_items()
    RETURNS TABLE (resource_type varchar, deleted_count integer)
    LANGUAGE sql SECURITY DEFINER AS $$ SELECT 'synthetic'::varchar, 0 WHERE false $$;
  CREATE FUNCTION public.cleanup_old_audit_logs() RETURNS integer
    LANGUAGE sql SECURITY DEFINER AS $$ SELECT 0 $$;
  CREATE FUNCTION public.create_audit_log(varchar, varchar, uuid, jsonb, jsonb, jsonb) RETURNS uuid
    LANGUAGE sql SECURITY DEFINER AS $$ SELECT NULL::uuid $$;
  CREATE FUNCTION public.get_audit_logs(integer, integer, varchar, varchar, timestamptz, timestamptz)
    RETURNS TABLE (id uuid, user_id uuid, user_name text, action varchar, resource_type varchar,
      resource_id uuid, old_values jsonb, new_values jsonb, ip_address inet, user_agent text,
      metadata jsonb, created_at timestamptz)
    LANGUAGE sql SECURITY DEFINER AS $$
      SELECT al.id, al.user_id, p.full_name, al.action::varchar, al.resource_type::varchar,
        al.id, NULL::jsonb, NULL::jsonb, NULL::inet, NULL::text, NULL::jsonb, al.created_at
      FROM public.audit_logs al LEFT JOIN public.profiles p ON p.id = al.user_id
      WHERE al.user_id = NULL::uuid LIMIT 0
    $$;
  CREATE VIEW public.audit_daily_summary AS
    SELECT created_at::date AS log_date, user_id, action, resource_type, count(*) AS action_count
    FROM public.audit_logs GROUP BY created_at::date, user_id, action, resource_type;
  CREATE VIEW public.audit_recent_activity AS
    SELECT al.id, al.user_id, p.full_name AS user_name, al.action, al.resource_type, al.created_at
    FROM public.audit_logs al LEFT JOIN public.profiles p ON p.id = al.user_id;
  -- Simulate explicit legacy view grants; audit views are not used by the UI.
  GRANT SELECT ON public.audit_daily_summary, public.audit_recent_activity TO anon, authenticated;
  -- Match the latest checked-in security baseline: these legacy SECURITY DEFINER
  -- RPCs were outside the public allowlist and had PUBLIC/anon revoked.
  REVOKE ALL ON FUNCTION public.cleanup_old_audit_logs() FROM PUBLIC, anon;
  REVOKE ALL ON FUNCTION public.cleanup_old_deleted_items() FROM PUBLIC, anon;
  REVOKE ALL ON FUNCTION public.create_audit_log(varchar,varchar,uuid,jsonb,jsonb,jsonb) FROM PUBLIC, anon;
  REVOKE ALL ON FUNCTION public.get_audit_logs(integer,integer,varchar,varchar,timestamptz,timestamptz) FROM PUBLIC, anon;
`);
await db.exec(migration);
await db.exec(sqlAssertions);

const rollbackDb = await db.query(`
  SELECT has_function_privilege('anon', 'public.cleanup_old_audit_logs()', 'EXECUTE') AS anon_cleanup,
    has_function_privilege('authenticated', 'public.cleanup_old_audit_logs()', 'EXECUTE') AS auth_cleanup,
    has_function_privilege('service_role', 'public.cleanup_old_audit_logs()', 'EXECUTE') AS service_cleanup,
    has_function_privilege('anon', 'public.cleanup_old_deleted_items()', 'EXECUTE') AS anon_deleted_cleanup,
    has_function_privilege('authenticated', 'public.cleanup_old_deleted_items()', 'EXECUTE') AS auth_deleted_cleanup,
    has_function_privilege('service_role', 'public.cleanup_old_deleted_items()', 'EXECUTE') AS service_deleted_cleanup,
    has_function_privilege('authenticated', 'public.create_audit_log(character varying,character varying,uuid,jsonb,jsonb,jsonb)', 'EXECUTE') AS auth_create,
    has_function_privilege('service_role', 'public.create_audit_log(character varying,character varying,uuid,jsonb,jsonb,jsonb)', 'EXECUTE') AS service_create,
    has_function_privilege('authenticated', 'public.get_audit_logs(integer,integer,character varying,character varying,timestamp with time zone,timestamp with time zone)', 'EXECUTE') AS auth_get,
    has_function_privilege('service_role', 'public.get_audit_logs(integer,integer,character varying,character varying,timestamp with time zone,timestamp with time zone)', 'EXECUTE') AS service_get
`);
assert.deepEqual(rollbackDb.rows[0], {
  anon_cleanup: false,
  auth_cleanup: false,
  service_cleanup: true,
  anon_deleted_cleanup: false,
  auth_deleted_cleanup: false,
  service_deleted_cleanup: true,
  auth_create: false,
  service_create: true,
  auth_get: true,
  service_get: true,
});
await db.exec(rollback);
const restored = await db.query(`
  SELECT has_function_privilege('anon', 'public.cleanup_old_audit_logs()', 'EXECUTE') AS anon_cleanup,
    has_function_privilege('service_role', 'public.cleanup_old_deleted_items()', 'EXECUTE') AS service_deleted_cleanup,
    has_function_privilege('authenticated', 'public.get_audit_logs(integer,integer,character varying,character varying,timestamp with time zone,timestamp with time zone)', 'EXECUTE') AS auth_get,
    has_function_privilege('service_role', 'public.get_audit_logs(integer,integer,character varying,character varying,timestamp with time zone,timestamp with time zone)', 'EXECUTE') AS service_get,
    (SELECT reloptions FROM pg_class WHERE oid='public.audit_daily_summary'::regclass) AS daily_options
`);
assert.deepEqual(restored.rows[0], {
  anon_cleanup: false,
  service_deleted_cleanup: false,
  auth_get: false,
  service_get: false,
  daily_options: null,
});
await db.close();

// The hosted database may not contain any of these legacy objects. The
// migration must still apply safely in that state.
const absentDb = new PGlite();
await absentDb.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
await absentDb.exec(migration);
await absentDb.exec(rollback);
await absentDb.close();
console.log('Synthetic audit grant, view, rollback, and absent-object checks passed.');
