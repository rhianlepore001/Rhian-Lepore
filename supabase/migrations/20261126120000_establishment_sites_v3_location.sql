begin;

-- Valida links do Google Maps aceitos no site público (somente https, sem credenciais, porta ou marcação)
create or replace function public.is_safe_google_maps_url(p_url text)
returns boolean
language sql
immutable
set search_path = ''
as $$
    select p_url is not null
       and length(p_url) <= 500
       and p_url !~ E'[[:space:][:cntrl:]<>"''`\\\\\\u00A0\\u1680\\u2000-\\u200B\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF]'
       and split_part(split_part(p_url, '?', 1), '#', 1) !~* '/(\.|%2e){1,2}(/|$)'
       and (
           p_url ~ '^https://(www\.)?google\.(com|com\.br|pt)/maps([/?#][^[:space:]]*)?$'
           or p_url ~ '^https://maps\.google\.com([/?#][^[:space:]]*)?$'
           or p_url ~ '^https://maps\.app\.goo\.gl/[^/?#[:space:]][^[:space:]]*$'
           or p_url ~ '^https://goo\.gl/maps/[^/?#[:space:]][^[:space:]]*$'
       );
$$;

revoke all on function public.is_safe_google_maps_url(text) from public;
grant execute on function public.is_safe_google_maps_url(text) to anon, authenticated, service_role;

-- RPC pública: acrescenta localização exata (endereço, link do Maps e coordenadas validados) ao contato publicado
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
                'addressNote', jsonb_path_query_first(c->'contact', '$.addressNote ? (@.type() == "string")'),
                'address', jsonb_path_query_first(c->'contact', '$.address ? (@.type() == "string")'),
                'mapsUrl', case
                    when jsonb_typeof(c->'contact'->'mapsUrl') = 'string'
                         and public.is_safe_google_maps_url(c->'contact'->>'mapsUrl')
                    then c->'contact'->'mapsUrl'
                end,
                'lat', case
                    when jsonb_typeof(c->'contact'->'lat') = 'number' and jsonb_typeof(c->'contact'->'lng') = 'number' then
                        case
                            when (c->'contact'->>'lat')::numeric between -90 and 90
                             and (c->'contact'->>'lng')::numeric between -180 and 180
                             and not ((c->'contact'->>'lat')::numeric = 0 and (c->'contact'->>'lng')::numeric = 0)
                            then c->'contact'->'lat'
                        end
                end,
                'lng', case
                    when jsonb_typeof(c->'contact'->'lat') = 'number' and jsonb_typeof(c->'contact'->'lng') = 'number' then
                        case
                            when (c->'contact'->>'lat')::numeric between -90 and 90
                             and (c->'contact'->>'lng')::numeric between -180 and 180
                             and not ((c->'contact'->>'lat')::numeric = 0 and (c->'contact'->>'lng')::numeric = 0)
                            then c->'contact'->'lng'
                        end
                end
            ))
        end
    ))) from published_site;
$$;

revoke all on function public.get_public_establishment_site(text) from public;
grant execute on function public.get_public_establishment_site(text) to anon, authenticated, service_role;

commit;
