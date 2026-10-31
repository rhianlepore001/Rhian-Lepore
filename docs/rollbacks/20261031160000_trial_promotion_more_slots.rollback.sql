-- Volta o limite da promoção signup_30d_first10 para 10 (nunca abaixo das vagas já usadas,
-- para não violar trial_promotions_used_le_max). Idempotente.
UPDATE public.trial_promotions
   SET max_uses = GREATEST(10, used)
 WHERE id = 'signup_30d_first10';
