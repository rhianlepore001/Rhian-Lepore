alter table public.membership_plans
    add column photo_path text,
    add constraint membership_plans_photo_path_check
        check (
            photo_path is null or (
                split_part(photo_path, '/', 1) = user_id
                and photo_path ~ '^[0-9a-f-]+/[0-9a-f-]+[.](jpg|png|webp)$'
            )
        );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'membership_plan_photos',
    'membership_plan_photos',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
);

create policy "Club owners can upload plan photos"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'membership_plan_photos'
    and (storage.foldername(name))[1] = (select public.get_auth_company_id())
    and (select public.get_auth_role()) = 'owner'
    and name ~ '^[0-9a-f-]+/[0-9a-f-]+[.](jpg|png|webp)$'
);

create policy "Club owners can list their plan photos"
on storage.objects for select to authenticated
using (
    bucket_id = 'membership_plan_photos'
    and (storage.foldername(name))[1] = (select public.get_auth_company_id())
    and (select public.get_auth_role()) = 'owner'
);

create policy "Club owners can remove unused plan photos"
on storage.objects for delete to authenticated
using (
    bucket_id = 'membership_plan_photos'
    and (storage.foldername(name))[1] = (select public.get_auth_company_id())
    and (select public.get_auth_role()) = 'owner'
    and not exists (
        select 1
        from public.membership_plans plan
        where plan.user_id = (select public.get_auth_company_id())
          and plan.photo_path = storage.objects.name
    )
);
