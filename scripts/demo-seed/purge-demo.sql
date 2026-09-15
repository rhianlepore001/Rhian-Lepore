-- Rollback dos tenants DEMO.
-- SÓ apaga linhas cujo profile.email casa com o padrão DEMO.
-- NÃO rode um DELETE sem o filtro do CTE `demo`.
--
-- Ordem respeita FKs do schema vivo (BARBER/Beauty OS).
-- auth.users NÃO é apagado aqui (Dashboard Auth ou script com --delete-auth-users).

BEGIN;

CREATE TEMP TABLE demo_tenants ON COMMIT DROP AS
SELECT id, email
FROM public.profiles
WHERE email ~* '^agendix\.demo\.(barber|beauty)(\+[a-z0-9._-]+)?@example\.com$';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM demo_tenants) THEN
    RAISE NOTICE 'Nenhum tenant DEMO encontrado. Nada a apagar.';
  END IF;
END $$;

DELETE FROM public.queue_payments
 WHERE business_id IN (SELECT id FROM demo_tenants);

DELETE FROM public.queue_entries
 WHERE business_id IN (SELECT id FROM demo_tenants);

DELETE FROM public.pix_payments
 WHERE user_id IN (SELECT id FROM demo_tenants);

DELETE FROM public.membership_payments
 WHERE user_id IN (SELECT id FROM demo_tenants);

DELETE FROM public.client_memberships
 WHERE user_id IN (SELECT id FROM demo_tenants);

DELETE FROM public.membership_plans
 WHERE user_id IN (SELECT id FROM demo_tenants);

DELETE FROM public.appointment_product_lines
 WHERE company_id::text IN (SELECT id FROM demo_tenants);

DELETE FROM public.product_sales
 WHERE company_id::text IN (SELECT id FROM demo_tenants);

DELETE FROM public.finance_records
 WHERE user_id IN (SELECT id FROM demo_tenants);

DELETE FROM public.appointments
 WHERE user_id IN (SELECT id FROM demo_tenants);

DELETE FROM public.public_bookings
 WHERE business_id IN (SELECT id FROM demo_tenants);

DELETE FROM public.public_clients
 WHERE business_id IN (SELECT id FROM demo_tenants);

DELETE FROM public.products
 WHERE company_id::text IN (SELECT id FROM demo_tenants);

DELETE FROM public.clients
 WHERE user_id IN (SELECT id FROM demo_tenants);

DELETE FROM public.service_upsells
 WHERE user_id IN (SELECT id FROM demo_tenants);

DELETE FROM public.services
 WHERE user_id IN (SELECT id FROM demo_tenants);

DELETE FROM public.service_categories
 WHERE user_id IN (SELECT id FROM demo_tenants);

DELETE FROM public.commission_payments
 WHERE company_id IN (SELECT id FROM demo_tenants);

DELETE FROM public.goal_settings
 WHERE user_id::text IN (SELECT id FROM demo_tenants);

DELETE FROM public.team_members
 WHERE user_id IN (SELECT id FROM demo_tenants);

DELETE FROM public.onboarding_progress
 WHERE company_id IN (SELECT id FROM demo_tenants);

DELETE FROM public.business_settings
 WHERE user_id IN (SELECT id FROM demo_tenants);

DELETE FROM public.profiles
 WHERE id IN (SELECT id FROM demo_tenants);

COMMIT;
