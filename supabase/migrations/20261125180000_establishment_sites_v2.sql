begin;

-- 1. Timestamps para publicação, pré-renderização e sitemap
alter table public.establishment_sites
    add column if not exists updated_at timestamptz not null default now(),
    add column if not exists published_at timestamptz;

create or replace function public.set_establishment_sites_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    if new.published is true and coalesce(old.published, false) is false then
        new.published_at := now();
    end if;
    return new;
end;
$$;

drop trigger if exists trg_establishment_sites_timestamps on public.establishment_sites;
create trigger trg_establishment_sites_timestamps
    before update on public.establishment_sites
    for each row
    execute function public.set_establishment_sites_timestamps();

-- 2. Slugs reservados no banco (impede colisão com rotas do app e domínios reservados)
create or replace function public.is_reserved_site_slug(p_slug text)
returns boolean
language sql
immutable
set search_path = ''
as $$
    select lower(btrim(coalesce(p_slug, ''))) = any (array[
        'admin', 'app', 'www', 'blog', 'suporte', 'ajuda', 'status', 'cdn', 'static',
        'mail', 'sitemap', 'robots', 'login', 'register', 'landing', 'termos',
        'privacidade', 'agenda', 'dashboard', 'configuracoes', 'book', 'site',
        'site-preview', 'site-demo', 's', 'pro', 'clube', 'minha-area', 'queue',
        'queue-status', 'avaliar', 'demo', 'demo-preview', 'api', 'assets',
        'onboarding', 'onboarding-wizard', 'staff-onboarding', 'forgot-password',
        'update-password', 'fila', 'clientes', 'produtos', 'financeiro', 'insights',
        'meus-insights', 'resultados-por-hora', 'club-demo'
    ]);
$$;

revoke all on function public.is_reserved_site_slug(text) from public;
grant execute on function public.is_reserved_site_slug(text) to anon, authenticated, service_role;

create or replace function public.enforce_reserved_business_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.business_slug is not null and public.is_reserved_site_slug(new.business_slug) then
        raise exception using errcode = '22023', message = 'reserved_business_slug';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_profiles_reserved_business_slug on public.profiles;
create trigger trg_profiles_reserved_business_slug
    before insert or update of business_slug on public.profiles
    for each row
    execute function public.enforce_reserved_business_slug();

create or replace function public.enforce_reserved_site_slug_on_publish()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_slug text;
begin
    if new.published is true then
        select p.business_slug into v_slug
        from public.profiles p
        where p.id = new.company_id;

        if v_slug is not null and public.is_reserved_site_slug(v_slug) then
            raise exception using errcode = '22023', message = 'reserved_business_slug';
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_establishment_sites_reserved_slug on public.establishment_sites;
create trigger trg_establishment_sites_reserved_slug
    before insert or update of published on public.establishment_sites
    for each row
    execute function public.enforce_reserved_site_slug_on_publish();

-- 3. Validação de URLs de mídia permitidas (somente ativos locais / Storage Supabase)
create or replace function public.is_safe_site_asset_url(p_url text)
returns boolean
language sql
immutable
set search_path = ''
as $$
    select coalesce(p_url, '') <> ''
       and p_url !~ '\.\.'
       and p_url !~* '%2e|%5c'
       and (
           p_url ~ '^/(demo|presenca)/[A-Za-z0-9._/-]+$'
           or p_url ~ '^https://lcqwrngscsziysyfhpfj\.supabase\.co/storage/v1/object/public/(logos|covers|service_images|team_photos|galleries|membership_plan_photos)/[^?#\\ ]+$'
       );
$$;

revoke all on function public.is_safe_site_asset_url(text) from public;
grant execute on function public.is_safe_site_asset_url(text) to anon, authenticated, service_role;

-- 4. Atualização da RPC pública com allowlist completa e proteção de URLs/slugs
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
          and not public.is_reserved_site_slug(p_slug)
          and s.published = true
          and s.presence_enabled = true
        limit 1
    )
    select jsonb_build_object('config', jsonb_strip_nulls(jsonb_build_object(
        'style', jsonb_path_query_first(c, '$.style ? (@.type() == "string")'),
        'preset', jsonb_path_query_first(c, '$.preset ? (@ == "urban" || @ == "editorial" || @ == "salon")'),
        'accent', jsonb_path_query_first(c, '$.accent ? (@.type() == "string")'),
        'background', jsonb_path_query_first(c, '$.background ? (@.type() == "string")'),
        'headline', jsonb_path_query_first(c, '$.headline ? (@.type() == "string")'),
        'about', jsonb_path_query_first(c, '$.about ? (@.type() == "string")'),
        'ctaLabel', jsonb_path_query_first(c, '$.ctaLabel ? (@.type() == "string")'),
        'logo', case
            when jsonb_typeof(c->'logo') = 'string' and public.is_safe_site_asset_url(c->>'logo')
            then c->'logo'
        end,
        'logoRemoved', jsonb_path_query_first(c, '$.logoRemoved ? (@.type() == "boolean")'),
        'logoDisplay', jsonb_path_query_first(c, '$.logoDisplay ? (@ == "both" || @ == "logo")'),
        'cover', case
            when jsonb_typeof(c->'cover') = 'string' and public.is_safe_site_asset_url(c->>'cover')
            then c->'cover'
        end,
        'coverRemoved', jsonb_path_query_first(c, '$.coverRemoved ? (@.type() == "boolean")'),
        'photoFocus', jsonb_path_query_first(c, '$.photoFocus ? (@ == "top" || @ == "bottom" || @ == "center" || @ == "work" || @ == "space")'),
        'photoPosition', case
            when jsonb_typeof(c->'photoPosition') = 'object' then jsonb_strip_nulls(jsonb_build_object(
                'x', jsonb_path_query_first(c->'photoPosition', '$.x ? (@.type() == "number")'),
                'y', jsonb_path_query_first(c->'photoPosition', '$.y ? (@.type() == "number")')
            ))
        end,
        'seoTitle', jsonb_path_query_first(c, '$.seoTitle ? (@.type() == "string")'),
        'seoDescription', jsonb_path_query_first(c, '$.seoDescription ? (@.type() == "string")'),
        'offer', case
            when jsonb_typeof(c->'offer') = 'object' then jsonb_strip_nulls(jsonb_build_object(
                'enabled', jsonb_path_query_first(c->'offer', '$.enabled ? (@.type() == "boolean")'),
                'kind', jsonb_path_query_first(c->'offer', '$.kind ? (@ == "first_visit" || @ == "featured" || @ == "combo" || @ == "club")'),
                'title', jsonb_path_query_first(c->'offer', '$.title ? (@.type() == "string")'),
                'condition', jsonb_path_query_first(c->'offer', '$.condition ? (@.type() == "string")'),
                'serviceId', jsonb_path_query_first(c->'offer', '$.serviceId ? (@.type() == "string")'),
                'expires', jsonb_path_query_first(c->'offer', '$.expires ? (@.type() == "string")')
            ))
        end,
        'differences', case
            when jsonb_typeof(c->'differences') = 'array' then jsonb_path_query_array(c, '$.differences[*] ? (@.type() == "string")')
        end,
        'faq', case
            when jsonb_typeof(c->'faq') = 'array' then (
                select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                    'question', jsonb_path_query_first(item, '$.question ? (@.type() == "string")'),
                    'answer', jsonb_path_query_first(item, '$.answer ? (@.type() == "string")')
                ))), '[]'::jsonb)
                from jsonb_array_elements(c->'faq') item
                where jsonb_typeof(item) = 'object'
            )
        end,
        'sections', case
            when jsonb_typeof(c->'sections') = 'array' then (
                select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                    'id', jsonb_path_query_first(item, '$.id ? (@.type() == "string")'),
                    'enabled', jsonb_path_query_first(item, '$.enabled ? (@.type() == "boolean")')
                ))), '[]'::jsonb)
                from jsonb_array_elements(c->'sections') item
                where jsonb_typeof(item) = 'object'
            )
        end,
        'gallery', case
            when jsonb_typeof(c->'gallery') = 'array' then (
                select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                    'src', item->'src',
                    'alt', jsonb_path_query_first(item, '$.alt ? (@.type() == "string")')
                ))), '[]'::jsonb)
                from jsonb_array_elements(c->'gallery') item
                where jsonb_typeof(item) = 'object'
                  and jsonb_typeof(item->'src') = 'string'
                  and public.is_safe_site_asset_url(item->>'src')
            )
        end,
        'beforeAfter', case
            when jsonb_typeof(c->'beforeAfter') = 'array' then (
                select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                    'before', item->'before',
                    'after', item->'after',
                    'caption', jsonb_path_query_first(item, '$.caption ? (@.type() == "string")')
                ))), '[]'::jsonb)
                from jsonb_array_elements(c->'beforeAfter') item
                where jsonb_typeof(item) = 'object'
                  and jsonb_typeof(item->'before') = 'string'
                  and jsonb_typeof(item->'after') = 'string'
                  and public.is_safe_site_asset_url(item->>'before')
                  and public.is_safe_site_asset_url(item->>'after')
                  and (item->>'before') <> (item->>'after')
            )
        end,
        'serviceDetails', case
            when jsonb_typeof(c->'serviceDetails') = 'object' then (
                select coalesce(jsonb_object_agg(
                    key,
                    jsonb_strip_nulls(jsonb_build_object(
                        'description', jsonb_path_query_first(item, '$.description ? (@.type() == "string")'),
                        'audience', jsonb_path_query_first(item, '$.audience ? (@.type() == "string")'),
                        'priceFrom', jsonb_path_query_first(item, '$.priceFrom ? (@.type() == "boolean")'),
                        'priceNote', jsonb_path_query_first(item, '$.priceNote ? (@.type() == "string")'),
                        'image', case
                            when jsonb_typeof(item->'image') = 'string' and public.is_safe_site_asset_url(item->>'image')
                            then item->'image'
                        end,
                        'featured', jsonb_path_query_first(item, '$.featured ? (@.type() == "boolean")')
                    )) || case
                        when jsonb_typeof(item->'includes') = 'array'
                        then jsonb_build_object('includes', jsonb_path_query_array(item, '$.includes[*] ? (@.type() == "string")'))
                        else '{}'::jsonb
                    end
                ), '{}'::jsonb)
                from jsonb_each(c->'serviceDetails') entry(key, item)
                where jsonb_typeof(item) = 'object'
            )
        end,
        'teamDetails', case
            when jsonb_typeof(c->'teamDetails') = 'object' then (
                select coalesce(jsonb_object_agg(
                    key,
                    jsonb_strip_nulls(jsonb_build_object(
                        'bio', jsonb_path_query_first(item, '$.bio ? (@.type() == "string")'),
                        'image', case
                            when jsonb_typeof(item->'image') = 'string' and public.is_safe_site_asset_url(item->>'image')
                            then item->'image'
                        end
                    ))
                ), '{}'::jsonb)
                from jsonb_each(c->'teamDetails') entry(key, item)
                where jsonb_typeof(item) = 'object'
            )
        end,
        'contact', case
            when jsonb_typeof(c->'contact') = 'object' then jsonb_strip_nulls(jsonb_build_object(
                'phone', jsonb_path_query_first(c->'contact', '$.phone ? (@.type() == "string")'),
                'instagram', jsonb_path_query_first(c->'contact', '$.instagram ? (@.type() == "string")'),
                'addressNote', jsonb_path_query_first(c->'contact', '$.addressNote ? (@.type() == "string")')
            ))
        end
    ))) from published_site;
$$;

revoke all on function public.get_public_establishment_site(text) from public;
grant execute on function public.get_public_establishment_site(text) to anon, authenticated, service_role;

-- 5. Lista pública de slugs publicados para geração do sitemap.xml
create or replace function public.list_published_site_slugs()
returns table (slug text, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
    select p.business_slug as slug, coalesce(s.updated_at, s.created_at, now()) as updated_at
    from public.establishment_sites s
    join public.profiles p on p.id = s.company_id
    where s.published = true
      and s.presence_enabled = true
      and p.business_slug is not null
      and not public.is_reserved_site_slug(p.business_slug)
    order by p.business_slug;
$$;

revoke all on function public.list_published_site_slugs() from public;
grant execute on function public.list_published_site_slugs() to anon, authenticated, service_role;

-- 6. Bucket público para HTML pré-renderizado e sitemap.xml (escrito somente por service_role)
do $$
begin
    if to_regclass('storage.buckets') is not null then
        insert into storage.buckets (id, name, public)
        values ('published-sites', 'published-sites', true)
        on conflict (id) do nothing;

        drop policy if exists "Published sites are publicly accessible" on storage.objects;
        create policy "Published sites are publicly accessible"
            on storage.objects for select
            using (bucket_id = 'published-sites');
    end if;
end $$;

-- 7. Origem do agendamento vindo do site (?origem=instagram, google, qr, site)
do $$
begin
    if to_regclass('public.public_bookings') is not null then
        alter table public.public_bookings
            add column if not exists referral_source text;

        alter table public.public_bookings
            drop constraint if exists public_bookings_referral_source_check;

        alter table public.public_bookings
            add constraint public_bookings_referral_source_check
            check (referral_source is null or referral_source in ('instagram', 'google', 'qr', 'site'));
    end if;

    if to_regclass('public.appointments') is not null then
        alter table public.appointments
            add column if not exists referral_source text;

        alter table public.appointments
            drop constraint if exists appointments_referral_source_check;

        alter table public.appointments
            add constraint appointments_referral_source_check
            check (referral_source is null or referral_source in ('instagram', 'google', 'qr', 'site'));
    end if;
end $$;

create or replace function public.sync_appointment_referral_source()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.public_booking_id is not null and new.referral_source is null then
        if to_regclass('public.public_bookings') is not null then
            select pb.referral_source into new.referral_source
            from public.public_bookings pb
            where pb.id = new.public_booking_id
              and pb.business_id = new.user_id;
        end if;
    end if;
    return new;
end;
$$;

do $$
begin
    if to_regclass('public.appointments') is not null then
        drop trigger if exists trg_appointments_sync_referral_source on public.appointments;
        create trigger trg_appointments_sync_referral_source
            before insert on public.appointments
            for each row
            execute function public.sync_appointment_referral_source();
    end if;
end $$;

do $$
begin
    if to_regprocedure('public.create_public_booking(text, text, text, uuid[], uuid, timestamptz, numeric, integer, jsonb, uuid)') is not null then
        create or replace function public.create_public_booking(
            p_business_id text,
            p_customer_name text,
            p_customer_phone text,
            p_service_ids uuid[],
            p_professional_id uuid,
            p_appointment_time timestamptz,
            p_total_price numeric,
            p_duration_minutes integer,
            p_product_lines jsonb,
            p_review_token uuid,
            p_referral_source text
        )
        returns setof public.public_bookings
        language plpgsql
        security definer
        set search_path = ''
        as $fn$
        declare
            v_booking public.public_bookings%rowtype;
            v_source text;
        begin
            v_source := nullif(lower(btrim(coalesce(p_referral_source, ''))), '');
            if v_source is not null and v_source not in ('instagram', 'google', 'qr', 'site') then
                v_source := null;
            end if;

            if p_review_token is not null then
                for v_booking in
                    select * from public.create_public_booking(
                        p_business_id, p_customer_name, p_customer_phone, p_service_ids, p_professional_id,
                        p_appointment_time, p_total_price, p_duration_minutes, p_product_lines, p_review_token
                    )
                loop
                    if v_source is not null then
                        update public.public_bookings set referral_source = v_source where id = v_booking.id;
                        if to_regclass('public.appointments') is not null then
                            update public.appointments set referral_source = v_source where public_booking_id = v_booking.id and user_id = p_business_id;
                        end if;
                        v_booking.referral_source := v_source;
                    end if;
                    return next v_booking;
                end loop;
            else
                for v_booking in
                    select * from public.create_public_booking(
                        p_business_id, p_customer_name, p_customer_phone, p_service_ids, p_professional_id,
                        p_appointment_time, p_total_price, p_duration_minutes, p_product_lines
                    )
                loop
                    if v_source is not null then
                        update public.public_bookings set referral_source = v_source where id = v_booking.id;
                        if to_regclass('public.appointments') is not null then
                            update public.appointments set referral_source = v_source where public_booking_id = v_booking.id and user_id = p_business_id;
                        end if;
                        v_booking.referral_source := v_source;
                    end if;
                    return next v_booking;
                end loop;
            end if;
        end;
        $fn$;

        revoke all on function public.create_public_booking(text, text, text, uuid[], uuid, timestamptz, numeric, integer, jsonb, uuid, text) from public;
        grant execute on function public.create_public_booking(text, text, text, uuid[], uuid, timestamptz, numeric, integer, jsonb, uuid, text) to anon, authenticated, service_role;
    end if;

    if to_regprocedure('public.create_public_group_booking(text, text, text, timestamptz, jsonb, uuid[])') is not null then
        create or replace function public.create_public_group_booking(
            p_business_id text,
            p_customer_name text,
            p_customer_phone text,
            p_appointment_time timestamptz,
            p_people jsonb,
            p_review_tokens uuid[],
            p_referral_source text
        )
        returns setof public.public_bookings
        language plpgsql
        security definer
        set search_path = ''
        as $fn$
        declare
            v_booking public.public_bookings%rowtype;
            v_source text;
        begin
            v_source := nullif(lower(btrim(coalesce(p_referral_source, ''))), '');
            if v_source is not null and v_source not in ('instagram', 'google', 'qr', 'site') then
                v_source := null;
            end if;

            if p_review_tokens is not null then
                for v_booking in
                    select * from public.create_public_group_booking(
                        p_business_id, p_customer_name, p_customer_phone, p_appointment_time, p_people, p_review_tokens
                    )
                loop
                    if v_source is not null then
                        update public.public_bookings set referral_source = v_source where id = v_booking.id;
                        if to_regclass('public.appointments') is not null then
                            update public.appointments set referral_source = v_source where public_booking_id = v_booking.id and user_id = p_business_id;
                        end if;
                        v_booking.referral_source := v_source;
                    end if;
                    return next v_booking;
                end loop;
            else
                for v_booking in
                    select * from public.create_public_group_booking(
                        p_business_id, p_customer_name, p_customer_phone, p_appointment_time, p_people
                    )
                loop
                    if v_source is not null then
                        update public.public_bookings set referral_source = v_source where id = v_booking.id;
                        if to_regclass('public.appointments') is not null then
                            update public.appointments set referral_source = v_source where public_booking_id = v_booking.id and user_id = p_business_id;
                        end if;
                        v_booking.referral_source := v_source;
                    end if;
                    return next v_booking;
                end loop;
            end if;
        end;
        $fn$;

        revoke all on function public.create_public_group_booking(text, text, text, timestamptz, jsonb, uuid[], text) from public;
        grant execute on function public.create_public_group_booking(text, text, text, timestamptz, jsonb, uuid[], text) to anon, authenticated, service_role;
    end if;
end $$;

commit;
