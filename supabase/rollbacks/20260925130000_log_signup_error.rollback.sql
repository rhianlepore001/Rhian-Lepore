-- Rollback de 20260925130000_log_signup_error.sql
-- Estado atual em produção (consultado em 2026-09-25 via pg_proc): a função
-- public.log_signup_error NÃO existe; nenhuma outra função/tabela foi alterada.
-- Portanto o rollback é apenas remover a função. O front continua funcionando
-- (cai para log_error quando log_signup_error não existe).

DROP FUNCTION IF EXISTS public.log_signup_error(jsonb);
