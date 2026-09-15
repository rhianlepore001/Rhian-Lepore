-- Rollback SQL do seed demo AgendiX.
-- NÃO rode o bloco DELETE sem executar antes o SELECT de conferência.
-- Só atinge profiles cujo e-mail casa com agendix.demo.(barber|beauty)%
-- e cujo nome começa com 'DEMO ·' ou slug começa com 'demo-'.
--
-- Substitua os e-mails se usou DEMO_BARBER_EMAIL / DEMO_BEAUTY_EMAIL.

-- 1) Conferência (sempre rode isto primeiro)
SELECT id, email, business_name, business_slug, role, user_type
FROM public.profiles
WHERE email IN (
    'agendix.demo.barber@example.com',
    'agendix.demo.beauty@example.com'
  )
  AND (
    business_name LIKE 'DEMO ·%'
    OR business_slug LIKE 'demo-%'
  )
  AND COALESCE(role, 'owner') <> 'staff';

-- 2) Apaga linhas operacionais SOMENTE dos ids retornados acima.
--    Revise a lista. Se vier vazio, PARE.
DO $$
DECLARE
  demo_ids TEXT[];
BEGIN
  SELECT COALESCE(array_agg(id), '{}')
  INTO demo_ids
  FROM public.profiles
  WHERE email IN (
      'agendix.demo.barber@example.com',
      'agendix.demo.beauty@example.com'
    )
    AND (
      business_name LIKE 'DEMO ·%'
      OR business_slug LIKE 'demo-%'
    )
    AND COALESCE(role, 'owner') <> 'staff';

  IF array_length(demo_ids, 1) IS NULL THEN
    RAISE NOTICE 'Nenhum tenant demo encontrado. Nada apagado.';
    RETURN;
  END IF;

  RAISE NOTICE 'Apagando tenants demo: %', demo_ids;

  DELETE FROM public.queue_payments WHERE business_id = ANY (demo_ids);
  DELETE FROM public.queue_entries WHERE business_id = ANY (demo_ids);
  DELETE FROM public.membership_payments WHERE user_id = ANY (demo_ids);
  DELETE FROM public.client_memberships WHERE user_id = ANY (demo_ids);
  DELETE FROM public.membership_plans WHERE user_id = ANY (demo_ids);
  DELETE FROM public.appointment_product_lines WHERE company_id::text = ANY (demo_ids);
  DELETE FROM public.product_sales WHERE company_id::text = ANY (demo_ids);
  DELETE FROM public.products WHERE company_id::text = ANY (demo_ids);
  DELETE FROM public.public_bookings WHERE business_id = ANY (demo_ids);
  DELETE FROM public.public_clients WHERE business_id = ANY (demo_ids);
  DELETE FROM public.finance_records WHERE user_id = ANY (demo_ids);
  DELETE FROM public.appointments WHERE user_id = ANY (demo_ids);
  DELETE FROM public.clients WHERE user_id = ANY (demo_ids);
  DELETE FROM public.services WHERE user_id = ANY (demo_ids);
  DELETE FROM public.service_categories WHERE user_id = ANY (demo_ids);
  DELETE FROM public.goal_settings WHERE user_id::text = ANY (demo_ids);
  DELETE FROM public.onboarding_progress WHERE company_id = ANY (demo_ids);
  DELETE FROM public.team_members WHERE user_id = ANY (demo_ids);
  DELETE FROM public.business_settings WHERE user_id = ANY (demo_ids);
  DELETE FROM public.profiles WHERE id = ANY (demo_ids);

  RAISE NOTICE 'Linhas public.* dos tenants demo removidas. Apague auth.users no Dashboard (Authentication > Users) com os mesmos e-mails.';
END $$;
