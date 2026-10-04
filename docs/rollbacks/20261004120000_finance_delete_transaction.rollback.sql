-- Rollback de 20261004120000_finance_delete_transaction.
-- A função não existia em produção: DROP é o estado anterior.
DROP FUNCTION IF EXISTS public.delete_finance_transaction(uuid);
