-- Promoção signup_30d_first10: libera mais 10 vagas (limite de 10 para 20). SOMENTE ADITIVA:
-- só aumenta o limite da promoção existente; não altera tabelas, funções, triggers nem permissões.
-- Idempotente: rodar de novo não soma outra vez (leva o limite a 20 só se ainda estiver abaixo).
-- Rollback: docs/rollbacks/20261031160000_trial_promotion_more_slots.rollback.sql
UPDATE public.trial_promotions
   SET max_uses = 20
 WHERE id = 'signup_30d_first10'
   AND max_uses < 20;
