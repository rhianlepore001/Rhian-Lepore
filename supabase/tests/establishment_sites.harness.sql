create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '') $$;
create table public.profiles (id text primary key, business_slug text unique, company_id text, role text not null default 'owner');
create function public.get_auth_company_id() returns text language sql stable security definer set search_path = '' as $$ select coalesce(company_id, id) from public.profiles where id = auth.uid() $$;
create function public.get_auth_role() returns text language sql stable security definer set search_path = '' as $$ select role from public.profiles where id = auth.uid() $$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid(), public.get_auth_company_id(), public.get_auth_role() to authenticated;
insert into public.profiles (id, business_slug) values ('owner-a', 'house-a'), ('owner-b', 'house-b');
insert into public.profiles (id, business_slug, company_id, role) values ('staff-a', 'staff', 'owner-a', 'staff');

-- Stubs mínimos para testar referral_source no agendamento público
create table public.public_bookings (
    id uuid primary key default gen_random_uuid(),
    business_id text not null,
    customer_name text not null,
    customer_phone text not null,
    service_ids uuid[] not null,
    professional_id uuid,
    appointment_time timestamptz not null,
    total_price numeric not null,
    status text not null default 'confirmed',
    duration_minutes integer not null,
    product_lines jsonb not null default '[]'::jsonb
);

create table public.appointments (
    id uuid primary key default gen_random_uuid(),
    user_id text not null,
    public_booking_id uuid references public.public_bookings(id) on delete cascade
);

create function public.create_public_booking(
    p_business_id text, p_customer_name text, p_customer_phone text, p_service_ids uuid[],
    p_professional_id uuid, p_appointment_time timestamptz, p_total_price numeric,
    p_duration_minutes integer, p_product_lines jsonb
)
returns setof public.public_bookings
language plpgsql security definer
set search_path = ''
as $$
declare
    v_row public.public_bookings%rowtype;
begin
    insert into public.public_bookings (
        business_id, customer_name, customer_phone, service_ids,
        professional_id, appointment_time, total_price, duration_minutes, product_lines
    ) values (
        p_business_id, p_customer_name, p_customer_phone, p_service_ids,
        p_professional_id, p_appointment_time, p_total_price, p_duration_minutes, coalesce(p_product_lines, '[]'::jsonb)
    ) returning * into v_row;
    insert into public.appointments (user_id, public_booking_id) values (p_business_id, v_row.id);
    return next v_row;
end;
$$;

create function public.create_public_booking(
    p_business_id text, p_customer_name text, p_customer_phone text, p_service_ids uuid[],
    p_professional_id uuid, p_appointment_time timestamptz, p_total_price numeric,
    p_duration_minutes integer, p_product_lines jsonb, p_review_token uuid
)
returns setof public.public_bookings
language sql security definer
set search_path = ''
as $$
    select * from public.create_public_booking(
        p_business_id, p_customer_name, p_customer_phone, p_service_ids,
        p_professional_id, p_appointment_time, p_total_price, p_duration_minutes, p_product_lines
    );
$$;

grant execute on function public.create_public_booking(text, text, text, uuid[], uuid, timestamptz, numeric, integer, jsonb) to anon, authenticated, service_role;
grant execute on function public.create_public_booking(text, text, text, uuid[], uuid, timestamptz, numeric, integer, jsonb, uuid) to anon, authenticated, service_role;
