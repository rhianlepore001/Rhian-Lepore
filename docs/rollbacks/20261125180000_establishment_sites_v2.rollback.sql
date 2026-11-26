begin;

drop function if exists public.create_public_group_booking(text, text, text, timestamptz, jsonb, uuid[], text);
drop function if exists public.create_public_booking(text, text, text, uuid[], uuid, timestamptz, numeric, integer, jsonb, uuid, text);

do $$
begin
    if to_regclass('public.appointments') is not null then
        drop trigger if exists trg_appointments_sync_referral_source on public.appointments;
        alter table public.appointments drop constraint if exists appointments_referral_source_check;
        alter table public.appointments drop column if exists referral_source;
    end if;

    if to_regclass('public.public_bookings') is not null then
        alter table public.public_bookings drop constraint if exists public_bookings_referral_source_check;
        alter table public.public_bookings drop column if exists referral_source;
    end if;

    if to_regclass('storage.objects') is not null then
        drop policy if exists "Published sites are publicly accessible" on storage.objects;
    end if;
end $$;

drop function if exists public.sync_appointment_referral_source();
drop function if exists public.list_published_site_slugs();

drop trigger if exists trg_establishment_sites_reserved_slug on public.establishment_sites;
drop trigger if exists trg_profiles_reserved_business_slug on public.profiles;
drop trigger if exists trg_establishment_sites_timestamps on public.establishment_sites;

drop function if exists public.enforce_reserved_site_slug_on_publish();
drop function if exists public.enforce_reserved_business_slug();
drop function if exists public.set_establishment_sites_timestamps();

-- Restaura a get_public_establishment_site completa da v1
do $rb$
begin
    if to_regclass('public.establishment_sites') is not null then
        execute $q$
create or replace function public.get_public_establishment_site(p_slug text)
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
        'background', jsonb_path_query_first(c, '$.background ? (@.type() == "string")'),
        'headline', jsonb_path_query_first(c, '$.headline ? (@.type() == "string")'),
        'about', jsonb_path_query_first(c, '$.about ? (@.type() == "string")'),
        'cover', jsonb_path_query_first(c, '$.cover ? (@.type() == "string")'),
        'photoFocus', jsonb_path_query_first(c, '$.photoFocus ? (@ == "top" || @ == "bottom" || @ == "center")'),
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
        $q$;
    end if;
end $rb$;

drop function if exists public.is_safe_site_asset_url(text);
drop function if exists public.is_reserved_site_slug(text);

alter table if exists public.establishment_sites
    drop column if exists published_at,
    drop column if exists updated_at;

commit;
