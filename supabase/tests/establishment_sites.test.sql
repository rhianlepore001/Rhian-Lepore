set role authenticated;
select set_config('request.jwt.claim.sub', 'owner-a', false);
insert into public.establishment_sites (company_id, draft_config) values ('owner-a', '{"headline":"Draft secret","private":"do not expose"}');
do $$ begin
  assert (select count(*) = 1 from public.establishment_sites), 'owner sees own draft';
  assert public.get_public_establishment_site('house-a') is null, 'draft not public';
  begin
    insert into public.establishment_sites (company_id, draft_config) values ('owner-b', '{}');
    raise exception 'cross-tenant insert allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.establishment_sites set presence_enabled = true where company_id = 'owner-a';
    raise exception 'owner granted entitlement';
  exception when insufficient_privilege then null; end;
  begin
    update public.establishment_sites set published = true, published_config = '{}' where company_id = 'owner-a';
    raise exception 'publication without entitlement allowed';
  exception when check_violation then null; end;
end $$;

select set_config('request.jwt.claim.sub', 'owner-b', false);
do $$ begin
  assert (select count(*) = 0 from public.establishment_sites), 'other owner cannot read draft';
  update public.establishment_sites set draft_config = '{"headline":"hacked"}' where company_id = 'owner-a';
  assert not found, 'other owner cannot change draft';
end $$;

select set_config('request.jwt.claim.sub', 'staff-a', false);
do $$ begin
  assert (select count(*) = 0 from public.establishment_sites), 'staff cannot read draft';
  begin
    insert into public.establishment_sites (company_id, draft_config) values ('owner-a', '{}');
    raise exception 'staff inserted draft';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
-- Testa bloqueio de slugs reservados no banco
do $$ begin
  begin
    insert into public.profiles (id, business_slug) values ('reserved-test', 'admin');
    raise exception 'reserved slug admin allowed in profiles';
  exception when invalid_parameter_value then null; end;
  begin
    insert into public.profiles (id, business_slug) values ('reserved-test-2', 'APP');
    raise exception 'reserved slug APP allowed in profiles';
  exception when invalid_parameter_value then null; end;
end $$;

update public.establishment_sites set presence_enabled = true where company_id = 'owner-a';
set role authenticated;
select set_config('request.jwt.claim.sub', 'owner-a', false);
update public.establishment_sites set published = true, published_config = '{"headline":"Published","preset":"salon","logo":"https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/logos/owner-a/presenca-logo-1.webp","logoDisplay":"logo","ctaLabel":"Marcar agora","photoFocus":"work","photoPosition":{"x":42,"y":38},"cover":"https://evil.example.com/outside.jpg","private":"never public","style":"dark","background":"#09090B","offer":{"kind":"combo","title":"Boas-vindas","private":"never public"},"contact":{"phone":{"customerEmail":"hidden"},"addressNote":"Ao lado da praça","private":"hidden"},"beforeAfter":[{"before":"https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/galleries/owner-a/before.webp","after":"https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/membership_plan_photos/owner-a/after.webp","caption":"Corte","private":"hidden"},{"before":"/demo/barbearia/galeria-01.webp","after":"/demo/barbearia/galeria-01.webp","caption":"Duplicada"}],"gallery":[{"src":"https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/galleries/owner-a/photo.webp","alt":"Photo","private":"hidden"},{"src":"https://outro.supabase.co/storage/v1/object/public/galleries/owner-a/bad.webp","alt":"Other project"},{"src":"https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/gallery/owner-a/legacy.webp","alt":"Legacy bucket"},{"src":"https://evil.example.com/bad.jpg","alt":"External"}],"serviceDetails":{"cut":{"description":"Corte","featured":true,"private":"hidden","includes":["Consulta",{"customerPhone":"hidden"}]}}}' where company_id = 'owner-a';

set role anon;
do $$ begin
  assert public.get_public_establishment_site('house-a')->'config'->>'headline' = 'Published', 'published snapshot visible';
  assert not ((public.get_public_establishment_site('house-a')->'config') ? 'private'), 'private top-level keys dropped';
  assert not (public.get_public_establishment_site('house-a')::text like '%Draft secret%'), 'draft never exposed';
  assert not (public.get_public_establishment_site('house-a')::text like '%never public%'), 'unknown nested offer keys dropped';
  assert not (public.get_public_establishment_site('house-a')::text like '%hidden%'), 'nested private fields and malformed scalar values dropped';
  assert not (public.get_public_establishment_site('house-a')::text like '%evil.example.com%'), 'external image urls dropped by allowlist';
  assert not (public.get_public_establishment_site('house-a')::text like '%outro.supabase.co%'), 'other supabase project urls dropped';
  assert not (public.get_public_establishment_site('house-a')::text like '%/gallery/%'), 'legacy gallery bucket dropped';
  assert public.get_public_establishment_site('house-a')#>>'{config,serviceDetails,cut,description}' = 'Corte', 'service content retained';
  assert public.get_public_establishment_site('house-a')#>>'{config,serviceDetails,cut,featured}' = 'true', 'featured flag retained';
  assert public.get_public_establishment_site('missing') is null, 'unknown slug empty';
  assert public.get_public_establishment_site('admin') is null, 'reserved slug admin returns null';
  assert public.get_public_establishment_site('house-a')#>>'{config,photoFocus}' = 'work', 'allowed photo focus retained';
  assert public.get_public_establishment_site('house-a')#>>'{config,logo}' = 'https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/logos/owner-a/presenca-logo-1.webp', 'allowed supabase storage logo retained';
  assert public.get_public_establishment_site('house-a')#>>'{config,preset}' = 'salon', 'allowed preset retained';
  assert public.get_public_establishment_site('house-a')#>>'{config,background}' = '#09090B', 'allowed background retained';
  assert jsonb_array_length(public.get_public_establishment_site('house-a')->'config'->'beforeAfter') = 1, 'duplicate before/after pair dropped';
  assert jsonb_array_length(public.get_public_establishment_site('house-a')->'config'->'gallery') = 1, 'external gallery url dropped';
  assert (select count(*) = 1 and min(slug) = 'house-a' from public.list_published_site_slugs()), 'sitemap lists published slug';
end $$;

-- Testa registro de referral_source (?origem=) em public_bookings e appointments
do $$
declare
  v_booking public.public_bookings%rowtype;
begin
  select * into v_booking
  from public.create_public_booking(
    'owner-a', 'Cliente Teste', '11999990000', array['d0000000-0000-4000-8001-000000000020'::uuid],
    null, now() + interval '1 day', 50, 30, '[]'::jsonb, gen_random_uuid(), 'Instagram'
  );
  assert v_booking.referral_source = 'instagram', 'referral_source normalized and stored on public_bookings';
end $$;
reset role;
do $$ begin
  assert (select a.referral_source = 'instagram' from public.appointments a join public.public_bookings b on b.id = a.public_booking_id where b.referral_source = 'instagram'), 'referral_source synced to appointments';
end $$;

reset role;
update public.establishment_sites set published = false, presence_enabled = false where company_id = 'owner-a';
set role anon;
do $$ begin
  assert public.get_public_establishment_site('house-a') is null, 'disabled entitlement hides site';
  assert (select count(*) = 0 from public.list_published_site_slugs()), 'unpublished site removed from sitemap';
end $$;
reset role;
select 'PASS: tenant isolation, owner permissions, entitlement, publication, reserved slugs, storage url allowlist and referral_source';
