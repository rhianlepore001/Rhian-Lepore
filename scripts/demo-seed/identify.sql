-- Identificar tenants DEMO (read-only).
-- Padrão de e-mail: agendix.demo.(barber|beauty)[@+]example.com
-- Não altera dados.

SELECT
  id,
  email,
  business_name,
  business_slug,
  user_type,
  region,
  subscription_status,
  public_booking_enabled,
  tutorial_completed,
  activation_completed
FROM public.profiles
WHERE email ~* '^agendix\.demo\.(barber|beauty)(\+[a-z0-9._-]+)?@example\.com$';
