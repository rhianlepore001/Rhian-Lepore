create schema if not exists private;

create index if not exists appointments_public_booking_company_idx
    on public.appointments (public_booking_id, user_id) where public_booking_id is not null;

create table private.customer_review_links (
    token_hash bytea primary key,
    company_id text not null,
    booking_id uuid references public.public_bookings(id) on delete cascade,
    appointment_id uuid references public.appointments(id) on delete cascade,
    check (num_nonnulls(booking_id, appointment_id) = 1)
);

create index customer_review_links_booking_idx
    on private.customer_review_links (booking_id) where booking_id is not null;
create index customer_review_links_appointment_idx
    on private.customer_review_links (appointment_id) where appointment_id is not null;

create table private.customer_reviews (
    id uuid primary key default gen_random_uuid(),
    company_id text not null,
    booking_id uuid unique references public.public_bookings(id) on delete cascade,
    appointment_id uuid unique references public.appointments(id) on delete cascade,
    rating smallint not null check (rating between 1 and 5),
    comment text check (char_length(comment) <= 500),
    created_at timestamptz not null default now(),
    check (num_nonnulls(booking_id, appointment_id) = 1)
);

create index customer_reviews_company_date_idx
    on private.customer_reviews (company_id, created_at desc, id desc);

alter table private.customer_review_links enable row level security;
alter table private.customer_reviews enable row level security;
revoke all on private.customer_review_links, private.customer_reviews from public, anon, authenticated;

create function private.customer_review_token_hash(p_token uuid)
returns bytea
language sql immutable strict
set search_path = ''
as $$
    select pg_catalog.sha256(pg_catalog.convert_to(p_token::text, 'UTF8'));
$$;

create function private.customer_review_visit_is_complete(p_company_id text, p_booking_id uuid, p_appointment_id uuid)
returns boolean
language sql stable
set search_path = ''
as $$
    select case when p_booking_id is not null then (
        select coalesce(bool_and(coalesce(a.status = 'Completed' and a.appointment_time <= now(), false)), false)
        from public.public_bookings b
        join public.appointments a on a.public_booking_id = b.id and a.user_id = b.business_id
        where b.id = p_booking_id
          and b.business_id = p_company_id
          and b.status in ('confirmed', 'completed')
          and a.status is distinct from 'Cancelled'
    ) else exists (
        select 1 from public.appointments a
        where a.id = p_appointment_id
          and a.user_id = p_company_id
          and a.status = 'Completed'
          and a.appointment_time <= now()
    ) end;
$$;

create function public.create_public_booking(
    p_business_id text, p_customer_name text, p_customer_phone text, p_service_ids uuid[],
    p_professional_id uuid, p_appointment_time timestamptz, p_total_price numeric,
    p_duration_minutes integer, p_product_lines jsonb, p_review_token uuid
)
returns setof public.public_bookings
language plpgsql security definer
set search_path = ''
as $$
declare
    v_booking public.public_bookings%rowtype;
begin
    if p_review_token is null then
        raise exception using errcode = '22023', message = 'invalid_review_token';
    end if;

    for v_booking in
        select * from public.create_public_booking(
            p_business_id, p_customer_name, p_customer_phone, p_service_ids, p_professional_id,
            p_appointment_time, p_total_price, p_duration_minutes, p_product_lines
        )
    loop
        insert into private.customer_review_links (token_hash, company_id, booking_id)
        values (private.customer_review_token_hash(p_review_token), v_booking.business_id, v_booking.id);
        return next v_booking;
    end loop;
end;
$$;

create function public.create_public_group_booking(
    p_business_id text, p_customer_name text, p_customer_phone text,
    p_appointment_time timestamptz, p_people jsonb, p_review_tokens uuid[]
)
returns setof public.public_bookings
language plpgsql security definer
set search_path = ''
as $$
declare
    v_booking public.public_bookings%rowtype;
begin
    if jsonb_typeof(p_people) is distinct from 'array' then
        raise exception using errcode = '22023', message = 'invalid_review_token';
    end if;
    if cardinality(p_review_tokens) is distinct from jsonb_array_length(p_people)
       or array_position(p_review_tokens, null) is not null then
        raise exception using errcode = '22023', message = 'invalid_review_token';
    end if;

    for v_booking in
        select * from public.create_public_group_booking(
            p_business_id, p_customer_name, p_customer_phone, p_appointment_time, p_people
        )
    loop
        insert into private.customer_review_links (token_hash, company_id, booking_id)
        values (
            private.customer_review_token_hash(p_review_tokens[v_booking.group_position + 1]),
            v_booking.business_id,
            v_booking.id
        );
        return next v_booking;
    end loop;
end;
$$;

create function public.create_appointment_review_invite(p_appointment_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
    v_company text := public.get_auth_company_id();
    v_role text := public.get_auth_role();
    v_booking_id uuid;
    v_appointment_id uuid;
    v_token uuid;
begin
    select b.id, case when b.id is null then a.id end
    into v_booking_id, v_appointment_id
    from public.appointments a
    left join public.public_bookings b on b.id = a.public_booking_id and b.business_id = a.user_id
    where a.id = p_appointment_id
      and a.user_id = v_company
      and a.status = 'Completed'
      and (
          v_role = 'owner'
          or (v_role = 'staff' and exists (
              select 1 from public.team_members tm
              where tm.id = a.professional_id
                and tm.user_id::text = v_company
                and tm.staff_user_id = (select auth.uid())
                and tm.active = true
                and tm.deleted_at is null
          ))
      );

    if (v_booking_id is null and v_appointment_id is null)
       or not private.customer_review_visit_is_complete(v_company, v_booking_id, v_appointment_id) then
        raise exception using errcode = '42501', message = 'review_not_available';
    end if;

    if exists (
        select 1 from private.customer_reviews r
        where r.company_id = v_company and (r.booking_id = v_booking_id or r.appointment_id = v_appointment_id)
    ) then
        return jsonb_build_object('status', 'reviewed');
    end if;

    v_token := gen_random_uuid();
    insert into private.customer_review_links (token_hash, company_id, booking_id, appointment_id)
    values (private.customer_review_token_hash(v_token), v_company, v_booking_id, v_appointment_id);

    return jsonb_build_object('status', 'ready', 'token', v_token);
end;
$$;

create function public.get_customer_review_invite(p_token uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
    select coalesce((
        select jsonb_build_object(
            'status', case
                when r.rating is not null then 'reviewed'
                when private.customer_review_visit_is_complete(link.company_id, link.booking_id, link.appointment_id) then 'ready'
                when b.status in ('cancelled', 'no_show') or a.status in ('Cancelled', 'NoShow') then 'unavailable'
                else 'pending'
            end,
            'business_name', p.business_name,
            'business_slug', p.business_slug,
            'user_type', p.user_type,
            'region', p.region,
            'timezone', bs.timezone,
            'appointment_time', coalesce(b.appointment_time, a.appointment_time),
            'rating', r.rating
        )
        from private.customer_review_links link
        join public.profiles p on p.id = link.company_id
        left join public.business_settings bs on bs.user_id = link.company_id
        left join public.public_bookings b on b.id = link.booking_id and b.business_id = link.company_id
        left join public.appointments a on a.id = link.appointment_id and a.user_id = link.company_id
        left join private.customer_reviews r on r.company_id = link.company_id
            and (r.booking_id = link.booking_id or r.appointment_id = link.appointment_id)
        where link.token_hash = private.customer_review_token_hash(p_token)
    ), jsonb_build_object('status', 'unavailable'));
$$;

create function public.submit_customer_review(p_token uuid, p_rating integer, p_comment text default null)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
    v_link private.customer_review_links%rowtype;
    v_comment text := nullif(regexp_replace(p_comment, '^[[:space:]]+|[[:space:]]+$', '', 'g'), '');
    v_status text;
begin
    if p_rating is null or p_rating not between 1 and 5 or char_length(v_comment) > 500 then
        raise exception using errcode = '22023', message = 'invalid_review';
    end if;

    select link.* into v_link
    from private.customer_review_links link
    where link.token_hash = private.customer_review_token_hash(p_token);

    v_status := public.get_customer_review_invite(p_token)->>'status';
    if v_status = 'reviewed' then
        return public.get_customer_review_invite(p_token);
    end if;
    if v_status is distinct from 'ready' then
        raise exception using errcode = '42501', message = 'review_not_available';
    end if;

    insert into private.customer_reviews (company_id, booking_id, appointment_id, rating, comment)
    values (v_link.company_id, v_link.booking_id, v_link.appointment_id, p_rating, v_comment)
    on conflict do nothing;

    return public.get_customer_review_invite(p_token);
end;
$$;

create function public.get_public_customer_reviews(p_business_id text, p_offset integer default 0)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
    with visible as materialized (
        select r.id, r.rating, r.comment, r.created_at
        from private.customer_reviews r
        where r.company_id = p_business_id
          and private.customer_review_visit_is_complete(r.company_id, r.booking_id, r.appointment_id)
    ), page as (
        select *
        from visible
        order by created_at desc, id desc
        offset greatest(coalesce(p_offset, 0), 0)
        limit 6
    )
    select jsonb_build_object(
        'average', round(avg(visible.rating), 1),
        'total', count(*),
        'reviews', coalesce(
            (select jsonb_agg(to_jsonb(page) order by page.created_at desc, page.id desc) from page), '[]'::jsonb
        )
    )
    from visible;
$$;

revoke all on function private.customer_review_token_hash(uuid),
    private.customer_review_visit_is_complete(text, uuid, uuid)
from public, anon, authenticated;

revoke all on function public.create_public_booking(text, text, text, uuid[], uuid, timestamptz, numeric, integer, jsonb, uuid),
    public.create_public_group_booking(text, text, text, timestamptz, jsonb, uuid[]),
    public.get_customer_review_invite(uuid),
    public.submit_customer_review(uuid, integer, text),
    public.get_public_customer_reviews(text, integer),
    public.create_appointment_review_invite(uuid)
from public, anon, authenticated;

grant execute on function public.create_public_booking(text, text, text, uuid[], uuid, timestamptz, numeric, integer, jsonb, uuid),
    public.create_public_group_booking(text, text, text, timestamptz, jsonb, uuid[]),
    public.get_customer_review_invite(uuid),
    public.submit_customer_review(uuid, integer, text),
    public.get_public_customer_reviews(text, integer)
to anon, authenticated;

grant execute on function public.create_appointment_review_invite(uuid) to authenticated;
