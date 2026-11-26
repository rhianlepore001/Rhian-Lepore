do $$ begin
  assert (select relrowsecurity from pg_class where oid = 'public.establishment_sites'::regclass), 'RLS enabled';
  assert not has_table_privilege('anon', 'public.establishment_sites', 'SELECT'), 'anonymous table reads denied';
  assert not has_column_privilege('authenticated', 'public.establishment_sites', 'presence_enabled', 'UPDATE'), 'owner cannot grant entitlement';
  assert not has_column_privilege('authenticated', 'public.establishment_sites', 'presence_enabled', 'INSERT'), 'owner cannot insert entitlement';
  assert not has_table_privilege('authenticated', 'public.establishment_sites', 'DELETE'), 'owner cannot delete';
  assert not has_function_privilege('public', 'public.get_public_establishment_site(text)', 'EXECUTE'), 'RPC not executable by PUBLIC';
  assert has_function_privilege('anon', 'public.get_public_establishment_site(text)', 'EXECUTE'), 'public RPC available';
  assert not has_function_privilege('public', 'public.list_published_site_slugs()', 'EXECUTE'), 'sitemap RPC not executable by PUBLIC';
  assert has_function_privilege('anon', 'public.list_published_site_slugs()', 'EXECUTE'), 'sitemap RPC available';
  assert public.is_reserved_site_slug('admin'), 'admin slug reserved';
  assert public.is_reserved_site_slug('app'), 'app slug reserved';
  assert public.is_reserved_site_slug('www'), 'www slug reserved';
  assert public.is_reserved_site_slug('blog'), 'blog slug reserved';
  assert not public.is_safe_site_asset_url('https://evil.example.com/photo.jpg'), 'external url blocked';
  assert public.is_safe_site_asset_url('https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/logos/owner-a/presenca-logo-1.webp'), 'supabase storage logo allowed';
end $$;
