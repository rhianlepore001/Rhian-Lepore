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
update public.establishment_sites set presence_enabled = true where company_id = 'owner-a';
set role authenticated;
select set_config('request.jwt.claim.sub', 'owner-a', false);
update public.establishment_sites set published = true, published_config = '{"headline":"Published","preset":"salon","logo":"https://example.com/logo.webp","logoDisplay":"logo","ctaLabel":"Marcar agora","photoFocus":"work","photoPosition":{"x":42,"y":38},"private":"never public","style":"dark","background":"#09090B","offer":{"kind":"combo","title":"Boas-vindas","private":"never public"},"contact":{"phone":{"customerEmail":"hidden"},"addressNote":"Ao lado da praça","private":"hidden"},"beforeAfter":[{"before":"https://example.com/b.jpg","after":"https://example.com/a.jpg","caption":"Corte","private":"hidden"}],"gallery":[{"src":"https://example.com/photo.jpg","alt":"Photo","private":"hidden"}],"serviceDetails":{"cut":{"description":"Corte","featured":true,"private":"hidden","includes":["Consulta",{"customerPhone":"hidden"}]}}}' where company_id = 'owner-a';
set role anon;
do $$ begin
  assert public.get_public_establishment_site('house-a')->'config'->>'headline' = 'Published', 'published snapshot visible';
  assert not ((public.get_public_establishment_site('house-a')->'config') ? 'private'), 'private top-level keys dropped';
  assert not (public.get_public_establishment_site('house-a')::text like '%Draft secret%'), 'draft never exposed';
  assert not (public.get_public_establishment_site('house-a')::text like '%never public%'), 'unknown nested offer keys dropped';
  assert not (public.get_public_establishment_site('house-a')::text like '%hidden%'), 'nested private fields and malformed scalar values dropped';
  assert public.get_public_establishment_site('house-a')#>>'{config,serviceDetails,cut,description}' = 'Corte', 'service content retained';
  assert public.get_public_establishment_site('missing') is null, 'unknown slug empty';
  assert public.get_public_establishment_site('house-a')#>>'{config,photoFocus}' = 'work', 'allowed photo focus retained';
  assert public.get_public_establishment_site('house-a')#>>'{config,logo}' = 'https://example.com/logo.webp', 'allowed logo retained';
  assert public.get_public_establishment_site('house-a')#>>'{config,preset}' = 'salon', 'allowed preset retained';
  assert public.get_public_establishment_site('house-a')#>>'{config,background}' = '#09090B', 'allowed background retained';
end $$;
reset role;
update public.establishment_sites set published = false, presence_enabled = false where company_id = 'owner-a';
set role anon;
do $$ begin
  assert public.get_public_establishment_site('house-a') is null, 'disabled entitlement hides site';
end $$;
reset role;
select 'PASS: tenant isolation, owner permissions, entitlement, publication and public allowlist';
