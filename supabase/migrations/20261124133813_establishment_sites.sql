begin;

create table public.establishment_sites (
    company_id text primary key references public.profiles(id) on delete cascade,
    draft_config jsonb not null default '{}'::jsonb,
    published_config jsonb,
    published boolean not null default false,
    presence_enabled boolean not null default false,
    created_at timestamptz not null default now(),
    constraint establishment_site_draft_object check (jsonb_typeof(draft_config) = 'object' and octet_length(draft_config::text) <= 100000),
    constraint establishment_site_published_object check (published_config is null or (jsonb_typeof(published_config) = 'object' and octet_length(published_config::text) <= 100000)),
    constraint establishment_site_entitlement check (not published or (presence_enabled and published_config is not null))
);

alter table public.establishment_sites enable row level security;
revoke all on public.establishment_sites from public, anon, authenticated;
grant select on public.establishment_sites to authenticated;
grant insert (company_id, draft_config) on public.establishment_sites to authenticated;
grant update (draft_config, published_config, published) on public.establishment_sites to authenticated;
grant all on public.establishment_sites to service_role;

create policy establishment_sites_owner_select on public.establishment_sites
    for select to authenticated
    using (company_id = (select public.get_auth_company_id()) and (select public.get_auth_role()) = 'owner');
create policy establishment_sites_owner_insert on public.establishment_sites
    for insert to authenticated
    with check (company_id = (select public.get_auth_company_id()) and (select public.get_auth_role()) = 'owner');
create policy establishment_sites_owner_update on public.establishment_sites
    for update to authenticated
    using (company_id = (select public.get_auth_company_id()) and (select public.get_auth_role()) = 'owner')
    with check (company_id = (select public.get_auth_company_id()) and (select public.get_auth_role()) = 'owner');

create function public.get_public_establishment_site(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
    with published_site as (
        select s.published_config as c
        from public.establishment_sites s
        join public.profiles p on p.id = s.company_id
        where p.business_slug = p_slug
          and s.published = true
          and s.presence_enabled = true
        limit 1
    )
    select jsonb_build_object('config', jsonb_strip_nulls(jsonb_build_object(
        'style', jsonb_path_query_first(c, '$.style ? (@.type() == "string")'),
        'accent', jsonb_path_query_first(c, '$.accent ? (@.type() == "string")'),
        'headline', jsonb_path_query_first(c, '$.headline ? (@.type() == "string")'),
        'about', jsonb_path_query_first(c, '$.about ? (@.type() == "string")'),
        'cover', jsonb_path_query_first(c, '$.cover ? (@.type() == "string")'),
        'seoTitle', jsonb_path_query_first(c, '$.seoTitle ? (@.type() == "string")'),
        'seoDescription', jsonb_path_query_first(c, '$.seoDescription ? (@.type() == "string")'),
        'offer', case when jsonb_typeof(c->'offer') = 'object' then jsonb_strip_nulls(jsonb_build_object('enabled', jsonb_path_query_first(c->'offer', '$.enabled ? (@.type() == "boolean")'), 'title', jsonb_path_query_first(c->'offer', '$.title ? (@.type() == "string")'), 'condition', jsonb_path_query_first(c->'offer', '$.condition ? (@.type() == "string")'), 'serviceId', jsonb_path_query_first(c->'offer', '$.serviceId ? (@.type() == "string")'), 'expires', jsonb_path_query_first(c->'offer', '$.expires ? (@.type() == "string")'))) end,
        'differences', case when jsonb_typeof(c->'differences') = 'array' then jsonb_path_query_array(c, '$.differences[*] ? (@.type() == "string")') end,
        'faq', case when jsonb_typeof(c->'faq') = 'array' then (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('question', jsonb_path_query_first(item, '$.question ? (@.type() == "string")'), 'answer', jsonb_path_query_first(item, '$.answer ? (@.type() == "string")')))), '[]'::jsonb) from jsonb_array_elements(c->'faq') item where jsonb_typeof(item) = 'object') end,
        'sections', case when jsonb_typeof(c->'sections') = 'array' then (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', jsonb_path_query_first(item, '$.id ? (@.type() == "string")'), 'enabled', jsonb_path_query_first(item, '$.enabled ? (@.type() == "boolean")')))), '[]'::jsonb) from jsonb_array_elements(c->'sections') item where jsonb_typeof(item) = 'object') end,
        'gallery', case when jsonb_typeof(c->'gallery') = 'array' then (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('src', jsonb_path_query_first(item, '$.src ? (@.type() == "string")'), 'alt', jsonb_path_query_first(item, '$.alt ? (@.type() == "string")')))), '[]'::jsonb) from jsonb_array_elements(c->'gallery') item where jsonb_typeof(item) = 'object') end,
        'serviceDetails', case when jsonb_typeof(c->'serviceDetails') = 'object' then (select coalesce(jsonb_object_agg(key, jsonb_strip_nulls(jsonb_build_object('description', jsonb_path_query_first(item, '$.description ? (@.type() == "string")'), 'audience', jsonb_path_query_first(item, '$.audience ? (@.type() == "string")'), 'priceFrom', jsonb_path_query_first(item, '$.priceFrom ? (@.type() == "boolean")'), 'priceNote', jsonb_path_query_first(item, '$.priceNote ? (@.type() == "string")'), 'image', jsonb_path_query_first(item, '$.image ? (@.type() == "string")'))) || case when jsonb_typeof(item->'includes') = 'array' then jsonb_build_object('includes', jsonb_path_query_array(item, '$.includes[*] ? (@.type() == "string")')) else '{}'::jsonb end), '{}'::jsonb) from jsonb_each(c->'serviceDetails') entry(key, item) where jsonb_typeof(item) = 'object') end,
        'teamDetails', case when jsonb_typeof(c->'teamDetails') = 'object' then (select coalesce(jsonb_object_agg(key, jsonb_strip_nulls(jsonb_build_object('bio', jsonb_path_query_first(item, '$.bio ? (@.type() == "string")'), 'image', jsonb_path_query_first(item, '$.image ? (@.type() == "string")')))), '{}'::jsonb) from jsonb_each(c->'teamDetails') entry(key, item) where jsonb_typeof(item) = 'object') end,
        'contact', case when jsonb_typeof(c->'contact') = 'object' then jsonb_strip_nulls(jsonb_build_object('phone', jsonb_path_query_first(c->'contact', '$.phone ? (@.type() == "string")'), 'instagram', jsonb_path_query_first(c->'contact', '$.instagram ? (@.type() == "string")'), 'addressNote', jsonb_path_query_first(c->'contact', '$.addressNote ? (@.type() == "string")'))) end
    ))) from published_site;
$$;

revoke all on function public.get_public_establishment_site(text) from public;
grant execute on function public.get_public_establishment_site(text) to anon, authenticated, service_role;

commit;
