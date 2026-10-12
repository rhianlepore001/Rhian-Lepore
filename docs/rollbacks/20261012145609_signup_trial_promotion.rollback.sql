-- Rollback de 20261012145609_signup_trial_promotion.
-- Remove o trigger, a função e as tabelas da promoção. Os trial_ends_at já gravados (30 dias)
-- NÃO são alterados — quem ganhou a promoção mantém o prazo.
DROP TRIGGER IF EXISTS apply_signup_trial_promotion ON public.profiles;
DROP FUNCTION IF EXISTS public.apply_signup_trial_promotion();
DROP TABLE IF EXISTS public.trial_promotion_grants;
DROP TABLE IF EXISTS public.trial_promotions;
