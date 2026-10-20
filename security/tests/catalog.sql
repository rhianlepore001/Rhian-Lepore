BEGIN READ ONLY;

SELECT n.nspname AS schema, c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity,
       c.reloptions, c.relacl
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'storage') AND c.relkind IN ('r', 'v', 'm', 'p')
ORDER BY 1, 2;

SELECT table_schema, table_name, column_name, data_type, column_default, is_nullable
FROM information_schema.columns WHERE table_schema IN ('public', 'storage')
ORDER BY 1, 2, ordinal_position;

SELECT n.nspname, c.relname, con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'storage') ORDER BY 1, 2, 3;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname IN ('public', 'storage') ORDER BY 1, 2, 3;

SELECT p.oid::regprocedure, r.rolname AS owner, p.prosecdef, p.proconfig, p.proacl,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
       md5(pg_get_functiondef(p.oid)) AS definition_md5
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles r ON r.oid = p.proowner
WHERE n.nspname = 'public' ORDER BY 1;

SELECT grantee, table_schema, table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_schema IN ('public', 'storage') ORDER BY 1, 2, 3, 4;

SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes WHERE schemaname IN ('public', 'storage') ORDER BY 1, 2, 3;

ROLLBACK;
