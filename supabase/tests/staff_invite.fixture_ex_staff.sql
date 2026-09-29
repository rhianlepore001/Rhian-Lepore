-- Com o convite exigindo token, o recém-cadastrado a8 do harness do #105 passa a
-- ter o convite (token) no cadastro, como no fluxo real do app. Só roda quando
-- public.staff_invites existe (migration 20260929120000 aplicada).
DO $$
BEGIN
  IF to_regclass('public.staff_invites') IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.staff_invites (member_id, company_id, token)
  VALUES ('10000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000a0', repeat('a8', 32));
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('invite_token', repeat('a8', 32))
  WHERE id = '00000000-0000-0000-0000-0000000000a8';
END $$;
