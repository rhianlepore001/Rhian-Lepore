do $$ begin
  assert (select relrowsecurity from pg_class where oid = 'public.establishment_sites'::regclass), 'RLS enabled';
  assert not has_table_privilege('anon', 'public.establishment_sites', 'SELECT'), 'anonymous table reads denied';
  assert not has_column_privilege('authenticated', 'public.establishment_sites', 'presence_enabled', 'UPDATE'), 'owner cannot grant entitlement';
  assert not has_column_privilege('authenticated', 'public.establishment_sites', 'presence_enabled', 'INSERT'), 'owner cannot insert entitlement';
  assert not has_table_privilege('authenticated', 'public.establishment_sites', 'DELETE'), 'owner cannot delete';
  assert not has_function_privilege('public', 'public.get_public_establishment_site(text)', 'EXECUTE'), 'RPC not executable by PUBLIC';
  assert has_function_privilege('anon', 'public.get_public_establishment_site(text)', 'EXECUTE'), 'public RPC available';
end $$;
